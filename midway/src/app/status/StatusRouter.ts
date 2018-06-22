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

import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as os from 'os';
import * as process from 'process';
import * as v8 from 'v8';
import * as winston from 'winston';

import appStats from '../AppStats';
import { databases } from '../database/DatabaseRouter';

const Router = new KoaRouter();
export const initialize = () => { };

/**
 * Simple ping style status check
 */
Router.get('/', async (ctx, next) =>
{
  ctx.body = { status: 'ok' };
});

/**
 * returns some basic stats about the server process
 */
Router.get('/stats', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const dbs = await databases.status();

  ctx.body = {
    startTime: appStats.startTime,
    currentTime: new Date(),
    uptime: Date.now() - appStats.startTime.valueOf(),

    numRequests: appStats.numRequests,
    numRequestsCompleted: appStats.numRequestsCompleted,
    numRequestsThatThrew: appStats.numRequestsThatThrew,
    numRequestsPending: appStats.numRequests - appStats.numRequestsCompleted,

    v8: {
      // cachedDataVersionTag: v8.cachedDataVersionTag(),
      heapStatistics: v8.getHeapStatistics(),
      // heapSpaceStatistics: v8.getHeapSpaceStatistics(),
    },

    os:
      {
        arch: os.arch(),
        // constants:         os.constants,
        numCPUs: os.cpus().length,
        // endianness: os.endianness(),
        freemem: os.freemem(),
        // homedir: os.homedir(),
        // hostname: os.hostname(),
        loadavg: os.loadavg(),
        // networkInterfaces: os.networkInterfaces(),
        // platform: os.platform(),
        // release: os.release(),
        // tmpdir: os.tmpdir(),
        totalmem: os.totalmem(),
        uptime: os.uptime(),
      },

    process:
      {
        pid: process.pid,
        // ppid: process.ppid,
      },

    databases: dbs,
  };
});

Router.get('/logs', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const transport = winston['default'].transports['MemoryTransport'];
  ctx.body = (transport as any).getAll();
});

/**
 * to check if you are correctly logged in
 */
Router.post('/loggedin', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  ctx.body =
    {
      loggedIn: true,
    };
});

export default Router;
