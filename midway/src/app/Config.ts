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

import * as fs from 'fs';
import * as winston from 'winston';
import { CmdLineUsage } from './CmdLineArgs';
import { databases } from './database/DatabaseRouter';
import { DatabaseConfig } from './database/Databases';
import { UserConfig } from './users/Users';
import * as Util from './Util';

export interface Config
{
  config?: string;
  port?: number;
  db?: string;
  dsn?: string;
  debug?: boolean;
  help?: boolean;
  verbose?: boolean;
  databases?: object[];
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
      config = Util.updateObject(config, cfgSettings);
    }
    catch (e)
    {
      winston.error('Failed to read configuration settings from ' + String(config.config));
    }
  }
  return config;
}

export async function handleConfig(config: Config): Promise<void>
{
  winston.debug('Using configuration: ' + JSON.stringify(config));
  if (config.help === true)
  {
    // tslint:disable-next-line
    console.log(CmdLineUsage);
    process.exit();
  }

  if (config.verbose === true)
  {
    // TODO: get rid of this monstrosity once @types/winston is updated.
    (winston as any).level = 'verbose';
  }

  if (config.debug === true)
  {
    // TODO: get rid of this monstrosity once @types/winston is updated.
    (winston as any).level = 'debug';
  }

  if (config.databases !== undefined)
  {
    for (const database of config.databases)
    {
      const db = database as DatabaseConfig;
      const results = await databases.select([], { name: db.name });
      if (results.length > 0 && results[0].id !== undefined)
      {
        winston.info('Updating existing database item: ', db);
        db.id = results[0].id;
        await databases.upsert({} as UserConfig, db);
      } else
      {
        winston.info('Registering new database item: ', db);
        await databases.upsert({} as UserConfig, db);
        const insertedDB = await databases.select([], { name: db.name });
        db.id = insertedDB[0].id;
      }

      if (db.id !== undefined)
      {
        await databases.connect({} as UserConfig, db.id);
      }
    }
  }
}

export default Config;
