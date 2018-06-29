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

import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import sharedUtil from '../../../shared/Util';
import DatabaseController from '../database/DatabaseController';
import ElasticClient from '../database/elastic/client/ElasticClient';
import { MidwayLogger } from '../app/log/MidwayLogger';

export interface ScriptConfig
{
  id: string;
  lang: string;
  body: string;
}

export async function findScripts(dir: string): Promise<ScriptConfig[]>
{
  return new Promise<ScriptConfig[]>(async (resolve, reject) =>
  {
    const scripts: ScriptConfig[] = [];
    const readDirAsync = util.promisify(fs.readdir);
    const readFileAsync = util.promisify(fs.readFile);
    for (const file of await readDirAsync(dir))
    {
      const lang = path.extname(file).substr(1);
      if (lang === 'painless')
      {
        const id = path.basename(file, '.' + lang);
        const body = await readFileAsync(path.resolve(dir, file), 'utf8');
        scripts.push({ id, lang, body });
      }
      else
      {
        MidwayLogger.warn('Ignoring script file with unsupported extension: \"' + file + '\"');
      }
    }
    resolve(scripts);
  });
}

export async function provisionScripts(controller: DatabaseController)
{
  if (controller.getType() === 'ElasticController')
  {
    const client: ElasticClient = controller.getClient() as ElasticClient;
    const scripts: ScriptConfig[] = await findScripts(__dirname);
    for (const script of scripts)
    {
      try
      {
        const alive: boolean = await new Promise<boolean>(
          (resolve, reject) =>
          {
            client.ping({
              requestTimeout: 1000,
            }, (error) => resolve(!error));
          });

        if (alive === false)
        {
          MidwayLogger.info('Skipped provisioning script ' + script.id + ' for offline database ' + controller.getName());
          continue;
        }

        await new Promise(
          (resolve, reject) =>
          {
            client.putScript(
              {
                id: script.id,
                lang: script.lang,
                body: script.body,
              },
              sharedUtil.promise.makeCallback(resolve, reject));
          });

        MidwayLogger.info('Provisioned script ' + script.id + ' to database ' + controller.getName());
      }
      catch (e)
      {
        MidwayLogger.warn('Failed to provision script ' + script.id + ' to database '
          + controller.getName() + ': ' + JSON.stringify(e));
      }
    }
  }
  else
  {
    MidwayLogger.warn('Script provisioning not implemented for database type: ' + controller.getType());
  }
}

export default provisionScripts;
