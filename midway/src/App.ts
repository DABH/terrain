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

import * as Koa from 'koa';
import * as winston from 'winston';

import BabelRegister = require('babel-register');
import cmdLineArgs = require('command-line-args');
import convert = require('koa-convert');
import dateFormat = require('date-format');
import reqText = require('require-text');
import session = require('koa-generic-session');

import './auth/Passport.ts';
import DB from './DB';
import Middleware from './Middleware';
import Router from './Router';
import Users from './users/Users';
import Util from './Util';

// process command-line arguments
const optDefs = [
  {
    alias: 'p',
    defaultValue: 3000,
    name: 'port',
    type: Number,
  },
  {
    alias: 'd',
    defaultValue: '',
    name: 'dbtype',
    type: String,
  },
  {
    alias: 'f',
    defaultValue: '',
    name: 'dbfile',
    type: String,
  },
];

const args = cmdLineArgs(optDefs,
  {
    partial: true,
  });

if (args.dbtype.length > 0 && args.dbfile.length > 0)
{
  DB.loadSystemDB({ filename: args.dbfile }, args.dbtype);
}

const index = reqText('../../src/app/index.html', require);

Router.get('/bundle.js', async (ctx, next) =>
{
  // TODO render this if DEV, otherwise render compiled bundle.js
  ctx.body = await Util.getRequest('http://localhost:8080/bundle.js');
});

Router.get('/', async (ctx, next) =>
{
  await next();
  ctx.body = index.toString();
});

const app = new Koa();
app.proxy = true;
app.keys = ['your-session-secret'];
app.use(convert(session()));

app.use(Middleware.bodyParser());
app.use(Middleware.favicon('../src/app/favicon.ico'));
app.use(Middleware.logger(winston));
app.use(Middleware.responseTime());
app.use(Middleware.passport.initialize());
app.use(Middleware.passport.session());

app.use(Router.routes());

winston.configure(
  {
    transports:
    [
      new (winston.transports.Console)(
        {
          formatter: (options) =>
          {
            const message = options.message || '';
            const level = winston.config.colorize(options.level);
            const meta = options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta)
              : '';
            return `${options.timestamp()} [${process.pid}] ${level}: ${message} ${meta}`;
          },
          timestamp: () =>
          {
            return dateFormat('yyyy-MM-dd hh:mm:ss.SSS');
          },
        },
      ),
    ],
  });

const request = app.listen(args.port);

export default request;

// TODO list
// - import HTML rather than writing directly inline
// - kick off webpack dev server when in DEV mode (and kill it when server stops)
// - difference between prod and dev mode: prod references bundle.js static file
