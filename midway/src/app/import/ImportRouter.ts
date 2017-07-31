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

import * as stream from 'stream';

import * as asyncBusboy from 'async-busboy';
import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as winston from 'winston';

import { users } from '../users/UserRouter';
import * as Util from '../Util';
import { Import, ImportConfig } from './Import';
import { ImportTemplateConfig, ImportTemplates } from './ImportTemplates';

const Router = new KoaRouter();
export const imprt: Import = new Import();
const importTemplates = new ImportTemplates();

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('importing to database');
  const imprtConf: ImportConfig = ctx.request.body.body;
  Util.verifyParameters(imprtConf, ['contents', 'dbid', 'dbname', 'tablename', 'filetype', 'update']);
  Util.verifyParameters(imprtConf, ['originalNames', 'columnTypes', 'primaryKey', 'transformations']);

  ctx.body = await imprt.upsert(imprtConf);
});

Router.post('/headless', async (ctx, next) =>
{
  winston.info('importing to database, from file and template id');
  const { files, fields } = await asyncBusboy(ctx.req);
  const user = await users.loginWithAccessToken(Number(fields['id']), fields['accessToken']);
  if (user === null)
  {
    ctx.status = 400;
    return;
  }

  Util.verifyParameters(fields, ['templateID', 'filetype']);

  const templates: ImportTemplateConfig[] = await importTemplates.get(Number(fields['templateID']));
  if (templates.length === 0)
  {
    throw new Error('Invalid template ID provided: ' + String(fields['templateID']));
  }
  const template: ImportTemplateConfig = templates[0];

  let update: boolean = true;
  if (fields['update'] === 'false')
  {
    update = false;
  }
  else if (fields['update'] !== undefined && fields['update'] !== 'true')
  {
    throw new Error('Invalid value for parameter "update": ' + String(fields['update']));
  }

  let file: stream.Readable | null = null;
  for (const f of files)
  {
    if (f.fieldname === 'file')
    {
      file = f;
    }
  }
  if (file === null)
  {
    throw new Error('No file specified.');
  }

  const imprtConf: ImportConfig = {
    dbid: template['dbid'],
    dbname: template['dbname'],
    tablename: template['tablename'],
    csvHeaderMissing: template['csvHeaderMissing'],
    originalNames: template['originalNames'],
    columnTypes: template['columnTypes'],
    primaryKey: template['primaryKey'],
    transformations: template['transformations'],

    contents: await Util.getStreamContents(file),
    filetype: fields['filetype'],
    streaming: false,     // TODO: SUPPORT STREAMING
    update,
  };
  ctx.body = await imprt.upsert(imprtConf);
});

export default Router;
