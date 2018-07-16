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

import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';

import * as App from '../App';
import * as Util from '../AppUtil';
import { SchedulerConfig } from '../scheduler/SchedulerConfig';
import { TemplateConfig } from './TemplateConfig';
import Templates from './Templates';

const Router = new KoaRouter();

export const templates: Templates = new Templates();
export const initialize = () => templates.initialize();

// return all templates
Router.get('/:id?', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const id = ctx.params.id !== undefined ? ctx.params.id : undefined;
  ctx.body = await templates.get(id);
});

// Create a new template
Router.post('/create', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const template: TemplateConfig = ctx.request.body['body'];
  const requiredParams = [
    'templateName',
    'process',
    'sources',
    'sinks',
    'settings',
    'meta',
    'uiData',
  ];

  Util.verifyParameters(template, requiredParams);
  ctx.body = await templates.create(template);
});

// Delete a template
Router.post('/delete', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const params = ctx.request.body['body'];
  const requiredParams = [
    'templateId',
  ];
  Util.verifyParameters(params, requiredParams);

  const schedules: SchedulerConfig[] = await App.SKDR.getByTemplate(parseInt(ctx.params.templateId, 10));
  if (schedules.length !== 0)
  {
    throw new Error('Template is being used in an active schedule.');
  }

  await templates.delete(params.templateId);
  ctx.body = {};
});

Router.post('/update/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const template: TemplateConfig = ctx.request.body['body'];
  const requiredParams = [
    'id',
    'templateName',
    'process',
    'sources',
    'sinks',
    'settings',
    'meta',
    'uiData',
  ];
  if (template.id !== Number(ctx.params.id))
  {
    throw new Error('Template ID does not match the supplied id in the URL');
  }
  Util.verifyParameters(template, requiredParams);

  const schedules: SchedulerConfig[] = await App.SKDR.getByTemplate(parseInt(ctx.params.id, 10));
  if (schedules.length !== 0)
  {
    throw new Error('Template is being used in an active schedule.');
  }

  ctx.body = await templates.update(template);
});

export default Router;
