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

import * as Elastic from 'elasticsearch';

import { ElasticQueryHit } from '../../../../../shared/database/elastic/ElasticQueryResponse';
import SafeReadable from '../../../app/io/streams/SafeReadable';
import { MidwayLogger } from '../../../app/log/MidwayLogger';
import ElasticClient from '../client/ElasticClient';

export class ElasticReader extends SafeReadable
{
  private client: ElasticClient;
  private query: any;

  private _isEmpty: boolean = false;
  private querying: boolean = false;
  private doneReading: boolean = false;
  private streaming: boolean = false;
  private scrolling: boolean = false;
  private rowsProcessed: number = 0;
  private scroll: string;
  private size: number;

  private scrollID: string | undefined = undefined;

  private MAX_SEARCH_SIZE: number = 1000;
  private DEFAULT_SEARCH_SIZE: number = 500;
  private DEFAULT_SCROLL_TIMEOUT: string = '45m';
  private DEFAULT_ALL_SIZE: number = 2147483647;
  private numRequested: number = 0;

  constructor(client: ElasticClient, query: string | object, streaming: boolean = false)
  {
    super({ objectMode: true, highWaterMark: 1024 * 8 });

    this.client = client;
    if (typeof query === 'string')
    {
      this.query = JSON.parse(query);
    }
    else
    {
      this.query = query;
    }
    this.streaming = streaming;

    this.size = (query['size'] !== undefined) ? query['size'] as number : this.DEFAULT_ALL_SIZE;
    this.scroll = (query['scroll'] !== undefined) ? query['scroll'] : this.DEFAULT_SCROLL_TIMEOUT;
    this.numRequested = this.size;
    this.scrolling = streaming && (this.size > this.DEFAULT_SEARCH_SIZE);

    const body = {
      body: this.query,
    };

    if (this.scrolling)
    {
      body['scroll'] = this.scroll;
    }

    body['size'] = Math.min(this.size, this.MAX_SEARCH_SIZE);

    this.querying = true;
    this.client.search(
      body,
      this.makeSafe(this.scrollCallback.bind(this)));
  }

  public _read(size: number = 1024)
  {
    this.numRequested = size;
    this.continueScrolling();
  }

  public _destroy(error, callback)
  {
    this._final(callback);
  }

  public _final(callback)
  {
    this.doneReading = true;
    this.continueScrolling();
    if (callback !== undefined)
    {
      callback();
    }
  }

  public isEmpty(): boolean
  {
    return this._isEmpty;
  }

  private scrollCallback(error, response): void
  {
    if (error !== null && error !== undefined)
    {
      MidwayLogger.error(error);
      this.emit('error', error);
      return;
    }

    if (typeof response._scroll_id === 'string')
    {
      this.scrollID = response._scroll_id;
    }

    const hits: ElasticQueryHit[] = response.hits.hits;
    let length: number = hits.length;

    // trim off excess results
    if (this.rowsProcessed + length > this.size)
    {
      length = this.size - this.rowsProcessed;
      response.hits.hits = hits.slice(0, length);
    }

    this.rowsProcessed += length;
    this.numRequested = Math.max(0, this.numRequested - length);

    const shouldContinue = this.push(response);
    if (!shouldContinue)
    {
      this.numRequested = 0;
    }

    this.querying = false;
    this.doneReading = this.doneReading
      || !this.scrolling
      || length <= 0
      || this.rowsProcessed >= this.size;

    this.continueScrolling();
  }

  private continueScrolling()
  {
    if (this.querying)
    {
      return;
    }

    if (this.doneReading)
    {
      this._isEmpty = true;
      // stop scrolling
      if (this.scrollID !== undefined)
      {
        this.client.clearScroll({ scrollId: this.scrollID },
          this.makeSafe(() => this.push(null)));
        this.scrollID = undefined;
      }
      else
      {
        this.push(null);
      }

      return;
    }

    if (this.numRequested > 0 && this.scrollID !== undefined)
    {
      const params: Elastic.ScrollParams = {
        scrollId: this.scrollID,
        scroll: this.scroll,
      };

      // continue scrolling
      this.querying = true;
      this.client.scroll(params, this.makeSafe(this.scrollCallback.bind(this)));
    }
  }
}

export default ElasticReader;
