/*
University of Illinois/NCSA Open Source License 

Copyright (c) 2018 Terrain Data, Inc. and the authors. All rights reserved.

Developed by: Terrain Data, Inc. and
              the individuals who committed the code in this file.
              https://github.com/terraindata/terrain
                  
Permission is hereby granted, free of charge, to any person 
obtaining a copy of this software and associated documentation files 
(the "Software"), to deal with the Software without restriction, 
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, 
and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

* Redistributions of source code must retain the above copyright notice, 
  this list of conditions and the following disclaimers.

* Redistributions in binary form must reproduce the above copyright 
  notice, this list of conditions and the following disclaimers in the 
  documentation and/or other materials provided with the distribution.

* Neither the names of Terrain Data, Inc., Terrain, nor the names of its 
  contributors may be used to endorse or promote products derived from
  this Software without specific prior written permission.

This license supersedes any copyright notice, license, or related statement
following this comment block.  All files in this repository are provided
under the same license, regardless of whether a corresponding comment block
appears in them.  This license also applies retroactively to any previous
state of the repository, including different branches and commits, which
were made public on or after December 8th, 2018.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
CONTRIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH
THE SOFTWARE.
*/

// Copyright 2017 Terrain Data, Inc.

// tslint:disable:variable-name strict-boolean-expressions no-console restrict-plus-operands max-line-length

import * as commandLineArgs from 'command-line-args';
import * as getUsage from 'command-line-usage';
import * as jsonfile from 'jsonfile';
import * as puppeteer from 'puppeteer';
import * as sleep from 'sleep';

import { TestLogger } from '../shared/test/TestLogger';
import { filteringRecordBuilderActions, login, replayRREvents, waitForInput } from './FullstackUtils';

const COLUMN_SELECTOR = '#app > div.app > div.app-wrapper > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div.tabs-content > div > div > div:nth-child(1) > div > div > div.builder-title-bar > div.builder-title-bar-title > span > span > svg';
const CARDS_COLUMN_SELECTOR = '#app > div.app > div.app-wrapper > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div.tabs-content > div > div > div:nth-child(1) > div > div > div.builder-title-bar > div.builder-title-bar-title > span > span > div > div.menu-options-wrapper > div:nth-child(3) > div > div.menu-text-padding';
const CARDSTARTER_SELECTOR = '#cards-column-inner > div.info-area > div.info-area-buttons-container > div';

const optionDefinitions = [
  { name: 'record', alias: 'r', type: Boolean },
  { name: 'replay', alias: 'p', type: Boolean },
  { name: 'column', alias: 'c', type: String },
  { name: 'event', alias: 'e', type: String },
  { name: 'help', alias: 'h' },
  { name: 'directory', alias: 'd', type: String },
  { name: 'url', alias: 'u', type: String },
];

const usageSections = [
  {
    header: 'Terrain Redux Recorder',
    content: 'This application records Redux actions while you play the builder, and saves the log for creating new tests.',
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'help',
        description: 'Print this usage guide.',
      },
      {
        name: 'record',
        typeLabel: 'boolean',
        description: 'Record the actions.',
      },
      {
        name: 'replay',
        typeLabel: 'boolean',
        description: 'Replay the actions.',
      },
      {
        name: 'column',
        typeLabel: 'string',
        description: 'Which column (builder/pathfinder) to start.',
      },
      {
        name: 'event',
        typeLabel: 'string',
        description: 'The type (input/redux/all) of events been recorded or replayed',
      },
      {
        name: 'directory',
        typeLabel: '[underline]{directory}',
        description: 'Where to save/load the action json file.',
      },
      {
        name: 'url',
        typeLabel: '[underline]{builderURL}',
        description: 'Where to start from recording.',
      },
    ],
  },
];

async function startBuilder(page)
{
  await page.waitForSelector(COLUMN_SELECTOR);
  await page.click(COLUMN_SELECTOR);
  TestLogger.info('Select the column.');
  sleep.sleep(1);
  await page.waitForSelector(CARDS_COLUMN_SELECTOR);
  await page.click(CARDS_COLUMN_SELECTOR);
  TestLogger.info('Select the card column.');
  sleep.sleep(1);
  await page.waitForSelector(CARDSTARTER_SELECTOR);
  await page.click(CARDSTARTER_SELECTOR);
}

function recordJSConsoleOutput(page)
{
  page.on('console', (msg) =>
  {
    for (let i = 0; i < msg.args().length; ++i)
    {
      console.log('JS console' + `${i}: ${msg.args()[i]}`);
    }
  });
}

async function recordBuilderActions(browser, url, column: 'builder' | 'pathfinder')
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200 });
  await login(page, url);
  sleep.sleep(2);

  if (column === 'builder')
  {
    await startBuilder(page);
  }
  const records = await page.evaluate(() =>
  {
    window['TerrainTools'].setLogLevel();
    const recordList = window['TerrainTools'].terrainStoreLogger.serializeAllRecordName();
    window['TerrainTools'].terrainStoreLogger.serializeAction = true;
    return recordList;
  });
  await waitForInput('Typing to stop the recording.');
  console.log('stopping');

  await page.evaluate(() =>
  {
    window['TerrainTools'].terrainStoreLogger.serializeAction = false;
  });
  let actions = await page.evaluate(() =>
  {
    return window['TerrainTools'].terrainStoreLogger.actionSerializationLog;
  });
  actions = filteringRecordBuilderActions(actions);
  await page.close();
  const timestamp = Date();
  return { timestamp, records, actions };
}

async function rr()
{
  const options = commandLineArgs(optionDefinitions);
  const usage = getUsage(usageSections);
  if (options['help'] !== undefined)
  {
    console.log(usage);
    return;
  }

  // record
  let url = 'http://localhost:8080';
  if (options['url'] !== undefined)
  {
    url = options['url'];
  }
  let actionFileName = './actions.json';
  if (options['directory'] !== undefined)
  {
    actionFileName = options['directory'] + '/actions.json';
  }
  let startColumn: 'builder' | 'pathfinder';
  if (options['column'] !== undefined)
  {
    if (options['column'] !== 'builder' && options['column'] !== 'pathfinder')
    {
      console.log(usage);
      return;
    }
    startColumn = options['column'];
    // let's start from the first builder page
    url = 'http://localhost:3000/builder/!3';
  }
  let actionType = 'all';
  if (options['event'] === 'input')
  {
    actionType = 'input';
  } else if (options['event'] === 'redux')
  {
    actionType = 'redux';
  }

  const browser = await puppeteer.launch({ headless: false });

  if (options['record'])
  {
    try
    {
      const actions = await recordBuilderActions(browser, url, startColumn);
      // saving to options['directory']/actions.json
      jsonfile.writeFileSync(actionFileName, actions);
    } catch (e)
    {
      console.trace(e.message);
    }
  }

  if (options['replay'])
  {
    // loading from options['directory']/actions.json
    const actionFileData = jsonfile.readFileSync(actionFileName);
    const actions = actionFileData['actions'];
    const serializeRecords = actionFileData['records'];
    try
    {
      console.log('Replaying ' + actions.length + ' actions.');
      const page = await browser.newPage();
      await page.setViewport({ width: 1600, height: 1200 });
      await page.goto(url);
      await login(page, url);
      sleep.sleep(3);
      if (startColumn === 'builder')
      {
        await startBuilder(page);
      }
      await replayRREvents(page, url, actions, serializeRecords, async (action) =>
      {
        if (action.eventType)
        {
          if (actionType === 'redux')
          {
            return false;
          }
        } else
        {
          if (actionType === 'input')
          {
            return false;
          }
        }
        return true;
      }, async (action) =>
        {
          if (action.eventType === 'mousedown')
          {
            if (action.selector === 'etl-step-big-button')
            {
              sleep.sleep(10);
              return;
            } else if (action.selector === '.template-editor-top-bar > :nth-child(7)')
            {
              sleep.sleep(30);
              return;
            }
          } else if (action.eventType === 'keypress')
          {
            // no delay for key pressing, return
            return;
          }
          sleep.sleep(1);
        });
    } catch (e)
    {
      console.log(e.message);
      console.trace(e);
    }
    await waitForInput('Typing to stop the replay');
  }

  console.log('Closing the browser');
  await browser.close();
  console.log('The browser is closed.');
}

rr().catch((err) => console.log('Error when executing rr: ' + err));
