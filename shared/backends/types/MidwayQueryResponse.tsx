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

import ElasticQueryResult from '../elastic/ElasticQueryResponse';
import MidwayErrorItem from '../../error/MidwayErrorItem';
import QueryRequest from './QueryRequest';
import QueryResponse, {QueryResult} from './QueryResponse';

export default class MidwayQueryResponse extends QueryResponse
{
  public static fromJSON(json: string)
  {
    const responseObject = JSON.parse(json);
    return new MidwayQueryResponse(responseObject.result, responseObject.errors, responseObject.request);
  }

  public static fromParsedJsonObject(obj: any)
  {
    return new MidwayQueryResponse(obj.result, obj.errors, obj.request);
  }

  public static formatElasticResult(result: QueryResult): any[]
  {
    let ret = [];
    const r = result as ElasticQueryResult;
    const hits = r.hits.hits;
    const results = hits.map((hit) =>
    {
      const source = hit._source;
      source._index = hit._index;
      source._type = hit._type;
      source._id = hit._id;
      source._score = hit._score;
      source._sort = hit._sort;
      return source;
    });
    ret = results;
    return  ret;
  }

  public constructor(result: QueryResult, errors: MidwayErrorItem[] = [], request: QueryRequest)
  {
    super(result, errors, request);
  }

  public getResultsData(): any[]
  {
    let result;
    switch (this.request.databasetype)
    {
      case 'elastic':
        result = MidwayQueryResponse.formatElasticResult(this.result);
        break;
      default:
        result = [];
        console.log('Unknown request type when extracting results from midway query response ' + this.request.type);
    }
    return result;
  }
}
