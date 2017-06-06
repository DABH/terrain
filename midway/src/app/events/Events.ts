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

// Part of events PoC

import aesjs = require('aes-js');
import hashObj = require('hash-object');
import srs = require('secure-random-string');
import sha1 = require('sha1');

import ElasticConfig from '../../database/elastic/ElasticConfig';
import ElasticController from '../../database/elastic/ElasticController';
import ElasticDB from '../../database/elastic/tasty/ElasticDB';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import * as Util from '../Util';

// CREATE TABLE events (id integer PRIMARY KEY, date date NOT NULL, eventId text NOT NULL, ip text NOT NULL, \
// payload text NOT NULL, type text NOT NULL);

let elasticController: ElasticController;
let elasticDB: ElasticDB;
const elasticConfig: ElasticConfig = {
  hosts: ['http://localhost:9200'],
};
elasticController = new ElasticController(elasticConfig, 0, 'Events');
elasticDB = elasticController.getTasty().getDB() as ElasticDB;

const timeInterval: number = 5; // minutes before refreshing
const timePeriods: number = 2; // number of past intervals to check, minimum 1
const timeSalt: string = srs({ length: 256 });
const payloadSkeleton: object =
  {
    nola:
    {
      drink: '',
      ingredients: '',
    },
  };

export interface EventConfig
{
  date?: number;
  eventId: string;
  id?: number;
  ip?: string;
  message: string;
  payload: any;
  type: string;
}

export interface EventRequestConfig
{
  id?: number;
  ip: string;
  date?: number;
  message?: string;
  payload?: object;
  eventId: string;
  variantId?: string;
}

export class Events
{
  private eventTable: Tasty.Table;

  constructor()
  {
    this.eventTable = new Tasty.Table(
      'data',
      ['eventId'],
      [
        'date',
        'ip',
        'message',
        'payload',
        'type',
      ],
      'events',
    );
  }

  public async decodeMessage(event: EventConfig): Promise<boolean>
  {
    const checkTime = this.getClosestTime();
    const message = event['message'];
    const emptyPayloadHash: string = hashObj(this.getEmptyObject(event.payload));
    for (let tp = 0; tp < timePeriods; ++tp)
    {
      const newTime: number = checkTime - tp * timeInterval * 60;
      const privateKey: string = this.getUniqueId(event.ip as string, newTime);
      const decodedMsg: string = this.decrypt(message, privateKey);
      if (this.isJSON(decodedMsg) && emptyPayloadHash === hashObj(JSON.parse(decodedMsg)))
      {
        await this.storeEvent(event);
        return true;
      }
    }
    return false;
  }

  public decrypt(msg: string, privateKey: string): string
  {
    const key: any = aesjs.utils.utf8.toBytes(privateKey); // type UInt8Array
    const msgBytes: any = aesjs.utils.hex.toBytes(msg);
    const aesCtr: any = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    return aesjs.utils.utf8.fromBytes(aesCtr.decrypt(msgBytes));
  }

  public encodeMessage(eventReq: EventRequestConfig): EventRequestConfig
  {
    eventReq.payload = payloadSkeleton[eventReq.eventId];
    const privateKey: string = this.getUniqueId(eventReq.ip);
    eventReq.message = this.encrypt(JSON.stringify(eventReq.payload), privateKey);
    delete eventReq['ip'];
    return eventReq;
  }

  public encrypt(msg: string, privateKey: string): string
  {
    const key: any = aesjs.utils.utf8.toBytes(privateKey); // type UInt8Array
    const msgBytes: any = aesjs.utils.utf8.toBytes(msg);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    return aesjs.utils.hex.fromBytes(aesCtr.encrypt(msgBytes));
  }

  public isJSON(str: string): boolean
  {
    let res: any = false;
    try
    {
      res = JSON.parse(str);
    }
    catch (e)
    {
      return false;
    }
    return res;
  }

  public getClosestTime(): number
  {
    let currSeconds: any = new Date();
    currSeconds = Math.floor(currSeconds / 1000);
    return currSeconds - (currSeconds % (timeInterval * 60));
  }

  public getEmptyObject(payload: object): object
  {
    return Object.keys(payload).reduce((res, item) =>
    {
      res[item] = '';
      return res;
    },
      {});
  }

  public getUniqueId(IPSource: string, currTime?: number): string
  {
    if (currTime === undefined)
    {
      currTime = this.getClosestTime();
    }
    return sha1(currTime.toString() + IPSource + timeSalt).substring(0, 16);
  }

  public async storeEvent(event: EventConfig): Promise<any>
  {
    event.payload = JSON.stringify(event.payload);
    const events: object[] = [event as object];
    return await elasticController.getTasty().upsert(this.eventTable, events);
  }
}

export default Events;
