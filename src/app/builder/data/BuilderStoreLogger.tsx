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
import * as hdr from 'hdr-histogram-js';
import * as Immutable from 'immutable';
import * as TerrainLog from 'loglevel';
import * as Serialize from 'remotedev-serialize';
import { Block } from '../../../blocks/types/Block';
import {AllRecordNameArray, RecordsSerializer} from '../../Classes';

export default class BuilderStoreLogger
{
  public static actionLatencyLog: { [key: string]: hdr.Histogram } = {};

  public static recordingActionPercentileLatency = false;

  public static actionSerializationLog = [];
  public static serializeAction = false;

  public static reduxMiddleWare = (store: any) =>
    (next: any) =>
      (action: any): any =>
      {
        const actionStart = performance.now();
        let result;
        try
        {
          result = next(action);
        }
        catch (err)
        {
          TerrainLog.error('Builder Event caught an exception: ', action, err);
        }
        const actionEnd = performance.now();
        // should we log this event
        const actionLatency = actionEnd - actionStart;
        if (BuilderStoreLogger.recordingActionPercentileLatency)
        {
          if (BuilderStoreLogger.actionLatencyLog[action.type] === undefined)
          {
            BuilderStoreLogger.actionLatencyLog[action.type] = hdr.build();
          }
          BuilderStoreLogger.actionLatencyLog[action.type].recordValue(actionLatency);
        }
        if (BuilderStoreLogger.serializeAction)
        {
          BuilderStoreLogger.actionSerializationLog.push(RecordsSerializer.stringify(action));
        }
        TerrainLog.debug(String(action.type) + ' takes ' + String(actionLatency) + 'ms');
        return result;
      }

  public static replayAction(store, action: string)
  {
    //console.log('replaying ' + typeof action + ':' + action);
    const theAction = RecordsSerializer.parse(action);
    store.dispatch(theAction);
  }

  public static reportActionLatency()
  {
    for (const actionType in BuilderStoreLogger.actionLatencyLog)
    {
      if (BuilderStoreLogger.actionLatencyLog.hasOwnProperty(actionType))
      {
        const actionHdr: hdr.Histogram = BuilderStoreLogger.actionLatencyLog[actionType];
        TerrainLog.info(actionType, actionHdr.outputPercentileDistribution());
      }
    }
  }

  public static serializeAllRecordName()
  {
    return AllRecordNameArray;
  }
}
