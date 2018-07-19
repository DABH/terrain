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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:variable-name strict-boolean-expressions no-console restrict-plus-operands max-line-length

import * as ip from 'ip';
import * as jsonfile from 'jsonfile';
import * as puppeteer from 'puppeteer';
import * as sleep from 'sleep';
import * as request from 'then-request';

import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { TestLogger } from '../../../shared/test/TestLogger';
import { replayReduxEventOnly, replayRREvents } from '../../FullstackUtils';

const COLUMN_SELECTOR = '#app > div.app > div.app-wrapper > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div.tabs-content > div > div > div:nth-child(1) > div > div > div.builder-title-bar > div.builder-title-bar-title > span > span > svg';
const CARDS_COLUMN_SELECTOR = '#app > div.app > div.app-wrapper > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div.tabs-content > div > div > div:nth-child(1) > div > div > div.builder-title-bar > div.builder-title-bar-title > span > span > div > div.menu-options-wrapper > div:nth-child(3) > div > div.menu-text-padding';
const CARDSTARTER_SELECTOR = '#cards-column-inner > div.info-area > div.info-area-buttons-container > div';

expect.extend({ toMatchImageSnapshot } as any);

function getExpectedActionFile(): string
{
  return __dirname + '/actions.json';
}

async function takeAndCompareScreenShot(page, options?)
{
  const localOption = { failureThreshold: '0.01', failureThresholdType: 'percent' };
  if (options)
  {
    Object.assign(localOption, options);
  }
  const image = await page.screenshot();
  (expect(image) as any).toMatchImageSnapshot(localOption);
}

async function getChromeDebugAddress()
{
  try
  {
    const res = await (request as any)('GET', 'http://localhost:9222/json');
    const resBody = JSON.parse(res.getBody());
    const wsAddress = resBody[resBody.length - 1]['webSocketDebuggerUrl'];
    return wsAddress;
  } catch (err)
  {
    TestLogger.error(err);
    return undefined;
  }
}

async function takeBuilderActionScreenshot(page)
{
  await takeAndCompareScreenShot(page);
}

async function gotoStarterPage(page, url)
{
  await page.goto(url);
  TestLogger.info('Start builder at : ' + String(url));
  sleep.sleep(3);
}

describe('Replay a builder action', () =>
{
  let browser;
  let page;
  let actionFileData;
  beforeAll(async (done) =>
  {
    const wsAddress = await getChromeDebugAddress();
    browser = await puppeteer.connect({ browserWSEndpoint: wsAddress });
    TestLogger.info('Connected to the Chrome ' + wsAddress);
    actionFileData = jsonfile.readFileSync(getExpectedActionFile());
    done();
    // loading from options['directory']/actions.json
  });

  it('builder-replay', async (done) =>
  {
    page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1200 });
    const url = `http://${ip.address()}:3000/builder/!3`;
    await gotoStarterPage(page, url);
    await takeBuilderActionScreenshot(page);
    const actions = actionFileData['actions'];
    const serializeRecords = actionFileData['records'];
    console.log('Replaying ' + actions.length + ' actions.');
    await replayRREvents(page, url, actions, serializeRecords, replayReduxEventOnly, async (action) =>
    {
      sleep.sleep(1);
      await takeBuilderActionScreenshot(page);
      return true;
    });
    done();
  }, 600000);

  afterAll(async (done) =>
  {
    await page.close();
    TestLogger.info('The page is closed.');
    await browser.disconnect();
    done();
  });
});
