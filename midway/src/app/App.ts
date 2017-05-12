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
import * as http from 'http';
import * as Koa from 'koa';
import * as winston from 'winston';

import babelRegister = require('babel-register');
import convert = require('koa-convert');
import session = require('koa-generic-session');
import serve = require('koa-static-server');
import cors = require('kcors');
import srs = require('secure-random-string');

import * as DBUtil from '../database/Util';
import * as Tasty from '../tasty/Tasty';
import './auth/Passport';
import { CmdLineArgs, CmdLineUsage, Configuration } from './CmdLineArgs';
import './Logging';
import Middleware from './Middleware';
import RouteError from './RouteError';
import MidwayRouter from './Router';
import * as Util from './Util';

export let DB: Tasty.Tasty;

class App
{
  private static initializeDB(type: string, dsn: string): Tasty.Tasty
  {
    winston.info('Initializing system database { type: ' + type + ' dsn: ' + dsn + ' }');
    const controller = DBUtil.makeDatabaseController(type, dsn);
    return controller.getTasty();
  }

  private static handleConfig(config: Configuration)
  {
    winston.debug('Using configuration: ' + JSON.stringify(config));
    if (config.help === true)
    {
      // tslint:disable-next-line
      console.log(CmdLineUsage);
      process.exit();
    }

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

    return config;
  }

  private static uncaughtExceptionHandler(err: Error): void
  {
    winston.error('Uncaught Exception: ' + err.toString());
    // this is a good place to clean tangled resources
    process.abort();
  }

  private static unhandledRejectionHandler(err: Error): void
  {
    winston.error('Unhandled Promise Rejection: ' + err.toString());
  }

  private DB: Tasty.Tasty;
  private app: Koa;

  constructor(config: Configuration = CmdLineArgs)
  {
    process.on('uncaughtException', App.uncaughtExceptionHandler);
    process.on('unhandledRejection', App.unhandledRejectionHandler);

    config = App.handleConfig(config);
    winston.debug('Using configuration: ' + JSON.stringify(config));

    this.DB = App.initializeDB(config.db as string, config.dsn as string);
    DB = this.DB;

    this.app = new Koa();
    this.app.proxy = true;
    this.app.keys = [srs({ length: 256 })];
    this.app.use(cors());
    this.app.use(convert(session()));

    this.app.use(Middleware.bodyParser());
    this.app.use(Middleware.favicon('../src/app/favicon.ico'));
    this.app.use(Middleware.logger(winston));
    this.app.use(Middleware.responseTime());
    this.app.use(Middleware.passport.initialize());
    this.app.use(Middleware.passport.session());

    // make sure we insert the RouteErrorHandler first
    this.app.use(RouteError.RouteErrorHandler);
    this.app.use(MidwayRouter.routes());
    this.app.use(serve({ rootDir: './midway/src/assets', rootPath: '/assets' }));
  }

  public listen(port: number | undefined = CmdLineArgs.port): http.Server
  {
    return this.app.listen(port);
  }
}

export default App;

// TODO list
// - import HTML rather than writing directly inline
// - kick off webpack dev server when in DEV mode (and kill it when server stops)
// - difference between prod and dev mode: prod references bundle.js static file
