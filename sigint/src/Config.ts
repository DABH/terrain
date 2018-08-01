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

// Copyright 2017-2018 Terrain Data, Inc.

import * as fs from 'fs';

import { CmdLineUsage } from './CmdLineArgs';
import { logger } from './Logging';

export interface Config
{
  config?: string;
  port?: number;
  debug?: boolean;
  demo?: boolean;
  help?: boolean;
  verbose?: boolean;
  db?: string;
  instanceId?: string;
}

function updateObject<T>(obj: T, newObj: T): T
{
  for (const key in newObj)
  {
    if (newObj.hasOwnProperty(key))
    {
      obj[key] = newObj[key];
    }
  }
  return obj;
}

export function loadConfigFromFile(config: Config): Config
{
  // load options from a configuration file, if specified.
  if (config.config !== undefined)
  {
    try
    {
      const settings = fs.readFileSync(config.config, 'utf8');
      const cfgSettings = JSON.parse(settings);
      config = updateObject(config, cfgSettings);
    }
    catch (e)
    {
      logger.warn('Failed to read configuration settings from ' + String(config.config));
    }
  }
  return config;
}

export async function handleConfig(config: Config): Promise<void>
{
  logger.debug('Using configuration: ' + JSON.stringify(config));
  if (config.help === true)
  {
    // tslint:disable-next-line
    console.log(CmdLineUsage);
    process.exit();
  }

  if (config.verbose === true)
  {
    logger.level = 'verbose';
  }

  if (config.debug === true)
  {
    logger.level = 'debug';
  }
}

export default Config;
