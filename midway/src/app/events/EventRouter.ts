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
import * as winston from 'winston';

import * as Util from '../Util';
import * as Encryption from './Encryption';
import { EventConfig, Events } from './Events';

export const events: Events = new Events();
const Router = new KoaRouter();

async function storeEvent(request: any)
{
  const production = process.env.NODE_ENV === 'production';
  if (!production &&
    request.body !== undefined && Object.keys(request.body).length > 0 &&
    request.query !== undefined && Object.keys(request.body).length > 0)
  {
    throw new Error('Both request query and body cannot be set.');
  }

  if (!production &&
    (request.body === undefined ||
      request.body !== undefined && Object.keys(request.body).length === 0) &&
    (request.query === undefined ||
      request.query !== undefined && Object.keys(request.query).length === 0))
  {
    throw new Error('Either request query or body parameters are required.');
  }

  let req: object = request.body;
  if (req === undefined || (req !== undefined && Object.keys(req).length === 0))
  {
    req = request.query;
  }

  const event: EventConfig = {
    eventid: req['eventid'],
    variantid: req['variantid'],
    visitorid: req['visitorid'],
    source: {
      ip: request.ip,
      host: request.host,
      useragent: request.useragent,
      referer: request.header.referer,
    },
    timestamp: req['timestamp'],
    meta: req['meta'],
  };

  // const msg = await Encryption.decodeMessage(event);
  try
  {
    await events.storeEvent(event);
  }
  catch (e)
  {
    if (process.env.NODE_ENV === 'production')
    {
      return;
    }
    else
    {
      throw new Error('Error storing analytics event:' + String(e));
    }
  }
}

// Handle analytics event ingestion
Router.post('/', async (ctx, next) =>
{
  await storeEvent(ctx.request);
  ctx.body = '';
});

Router.get('/', async (ctx, next) =>
{
  await storeEvent(ctx.request);
  ctx.body = '';
});

// * eventid: the type of event (1: view / impression, 2: click / add-to-cart,  3: transaction)
// * variantid: list of variantids
// * start: start time of the interval
// * end: end time of the interval
// * agg: supported aggregation operations are:
//     `select` - returns all events between the specified interval
//     `histogram` - returns a histogram of events between the specified interval
//     `rate` - returns a ratio of two events between the specified interval
// * field (optional):
//     list of fields to operate on. if unspecified, it returns or aggregates all fields in the event.
// * interval (optional; required if `agg` is `histogram` or `rate`):
//     the resolution of interval for aggregation operations.
//     valid values are `year`, `quarter`, `month`, `week`, `day`, `hour`, `minute`, `second`;
//     also supported are values such as `1.5h`, `90m` etc.
//
Router.get('/agg', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  Util.verifyParameters(
    JSON.parse(JSON.stringify(ctx.request.query)),
    ['start', 'end', 'eventid', 'variantid', 'agg'],
  );
  winston.info('getting events for variant');
  const response: object[] = await events.AggregationHandler(ctx.request.query);
  ctx.body = response.reduce((acc, x) =>
  {
    for (const key in x)
    {
      if (x.hasOwnProperty(key) !== undefined)
      {
        acc[key] = x[key];
        return acc;
      }
    }
  }, {});
});

export default Router;
