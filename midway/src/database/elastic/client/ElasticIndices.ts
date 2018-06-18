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
import ElasticController from '../ElasticController';

/**
 * An client which acts as a selective isomorphic wrapper around
 * the elastic.js indices API.
 */
class ElasticIndices
{
  private controller: ElasticController;
  private delegate: Elastic.Client;

  constructor(controller: ElasticController, delegate: Elastic.Client)
  {
    this.controller = controller;
    this.delegate = delegate;
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-getmapping
   * @param params
   * @param callback
   */
  public getMapping(params: Elastic.IndicesGetMappingParams, callback: (error: any, response: any, status: any) => void): void
  {
    this.controller.modifyIndexParam(params, true);
    this.log('getMapping', params);
    return this.delegate.indices.getMapping(params, (err, res, status) =>
    {
      let newRes = res;
      if (this.controller.getIndexPrefix() !== '')
      {
        newRes = {};
        Object.keys(res).forEach((key) => {
          if (key.startsWith(this.controller.getIndexPrefix()))
          {
            newRes[key.substring(this.controller.getIndexPrefix().length)] = res[key];
          }
        });
      }
      callback(err, newRes, status);
    });
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-create
   * @param params
   * @param callback
   */
  public create(params: Elastic.IndicesCreateParams, callback: (error: any, response: any, status: any) => void): void
  {
    this.controller.modifyIndexParam(params);
    return this.delegate.indices.create(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-delete
   * @param params
   * @param callback
   */
  public delete(params: Elastic.IndicesDeleteParams, callback: (error: any, response: any, status: any) => void): void
  {
    return this.delegate.indices.delete(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-putmapping
   * @param params
   * @param callback
   */
  public putMapping(params: Elastic.IndicesPutMappingParams, callback: (err: any, response: any, status: any) => void): void
  {
    this.controller.modifyIndexParam(params);
    this.log('putMapping', params);
    return this.delegate.indices.putMapping(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-refresh
   * @param params
   * @param callback
   */
  public refresh(params: Elastic.IndicesRefreshParams, callback: (err: any, response: any) => void): void
  {
    this.controller.modifyIndexParam(params);
    this.log('refresh', params);
    return this.delegate.indices.refresh(params, callback);
  }

  private log(methodName: string, info: any)
  {
    this.controller.log('ElasticIndices.' + methodName, info);
  }
}

export default ElasticIndices;
