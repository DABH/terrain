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
import * as _ from 'lodash';
import * as request from 'request';

import { DatabaseControllerStatus } from '../../DatabaseControllerStatus';
import ElasticConfig from '../ElasticConfig';
import ElasticController from '../ElasticController';
import ElasticCluster from './ElasticCluster';
import ElasticIndices from './ElasticIndices';

/**
 * An client which acts as a selective isomorphic wrapper around
 * the elastic.js API.
 */
class ElasticClient
{
  public cluster: ElasticCluster;
  public indices: ElasticIndices;

  private controller: ElasticController;
  private config: ElasticConfig;
  private delegate: Elastic.Client;

  constructor(controller: ElasticController, config: ElasticConfig)
  {
    this.controller = controller;

    // Do not reuse objects to configure the elasticsearch Client class:
    // https://github.com/elasticsearch/elasticsearch-js/issues/33
    this.config = JSON.parse(JSON.stringify(config));
    this.controller.setStatus(DatabaseControllerStatus.CONNECTING);
    this.delegate = new Elastic.Client(_.extend(this.config));

    this.cluster = new ElasticCluster(controller, this.delegate);
    this.indices = new ElasticIndices(controller, this.delegate);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-ping
   */
  public ping(params: Elastic.PingParams, callback: (error: any, response: any) => void): void
  {
    this.log('ping', params);
    this.delegate.ping(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk
   */
  public bulk(params: Elastic.BulkIndexDocumentsParams, callback: (error: any, response: any) => void): void
  {
    const body: object[] = params.body;
    for (let i = 0; i < body.length;)
    {
      const obj = body[i];
      const keys = Object.keys(obj);
      if (keys.length !== 1)
      {
        throw new Error('Bad bulk params');
      }
      switch (keys[0])
      {
        case 'index':
        case 'create':
        case 'update':
          i += 2;
          break;
        case 'delete':
          i++;
          break;
        default:
          throw new Error('Bad bulk params');
      }
      this.controller.prependIndexTerm(obj[keys[0]]);
    }
    this.log('bulk', params);
    this.delegate.bulk(params, this.wrapCallback(callback, (res) =>
    {
      const items: any[] = res.items;
      items.forEach((item) =>
      {
        if (Object.keys(item).length !== 1)
        {
          throw new Error('Bad response');
        }
        const doc = item[Object.keys(item)[0]];
        this.controller.removeDocIndexPrefix(doc);
      });
    }));
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-delete
   */
  public delete(params: Elastic.DeleteDocumentParams,
    callback: (error: any, response: Elastic.DeleteDocumentResponse) => void): void
  {
    this.controller.prependIndexParam(params);
    this.log('delete', params);
    this.delegate.delete(params, this.wrapCallback(callback, this.controller.removeDocIndexPrefix.bind(this.controller)));
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-deletetemplate
   */
  public deleteTemplate(params: Elastic.DeleteTemplateParams, callback: (error: any, response: any) => void): void
  {
    this.log('deleteTemplate', params);
    const scriptParams: Elastic.DeleteScriptParams =
      {
        id: params.id,
        lang: 'mustache',
      };
    this.deleteScript(scriptParams, callback);
  }

  /**
   */
  public deleteScript(params: Elastic.DeleteScriptParams, callback: (error: any, response: any) => void): void
  {
    this.log('deleteScript', params);
    const host = this.getHostFromConfig();
    request({
      method: 'DELETE',
      url: String(host) + '/_scripts/' + params.id,
    }, (err, resp, body) => callback(err, JSON.parse(body)));

    // FIXME: Uncomment when putScript in elasticsearch.js is fixed to use the changed stored script body format in 6.1
    // https://www.elastic.co/guide/en/elasticsearch/reference/6.1/modules-scripting-using.html
    // this.delegate.deleteScript(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-gettemplate
   */
  public getTemplate(params: Elastic.GetTemplateParams, callback: (error: any, response: any) => void): void
  {
    this.log('getTemplate', params);
    const scriptParams: Elastic.GetScriptParams =
      {
        id: params.id,
        lang: 'mustache',
      };
    this.getScript(scriptParams, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-getscript
   */
  public getScript(params: Elastic.GetScriptParams,
    callback: (error: any, response: any) => void): void
  {
    this.log('get script', params);
    const host = this.getHostFromConfig();
    request({
      method: 'GET',
      json: true,
      url: String(host) + '/_scripts/' + params.id,
    }, (err, res, body) => callback(err, body));

    // FIXME: Uncomment when putScript in elasticsearch.js is fixed to use the changed stored script body format in 6.1
    // https://www.elastic.co/guide/en/elasticsearch/reference/6.1/modules-scripting-using.html
    // this.delegate.getScript(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-index
   */
  public index<T>(params: Elastic.IndexDocumentParams<T>, callback: (error: any, response: any) => void): void
  {
    this.controller.prependIndexParam(params);
    this.log('index', params);
    this.delegate.index(params, this.wrapCallback(callback, this.controller.removeDocIndexPrefix.bind(this.controller)));
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-update
   */
  public update(params: Elastic.UpdateDocumentParams, callback: (error: any, response: any) => void): void
  {
    this.controller.prependIndexParam(params);
    this.log('update', params);
    this.delegate.update(params, this.wrapCallback(callback, this.controller.removeDocIndexPrefix.bind(this.controller)));
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-putscript
   */
  public putScript(params: Elastic.PutScriptParams, callback: (err: any, response: any, status: any) => void): void
  {
    this.log('putScript', params);
    const host = this.getHostFromConfig();
    request({
      method: 'POST',
      url: String(host) + '/_scripts/' + params.id,
      json: true,
      body: {
        script: {
          lang: params.lang,
          source: params.body,
        },
      },
    }, (err, res, body) =>
      {
        callback(err, body, res.statusCode);
      });

    // FIXME: Uncomment when putScript in elasticsearch.js is fixed to use the changed stored script body format in 6.1
    // https://www.elastic.co/guide/en/elasticsearch/reference/6.1/modules-scripting-using.html
    // this.delegate.putScript(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-puttemplate
   */
  public putTemplate(params: Elastic.PutTemplateParams, callback: (err: any, response: any, status: any) => void): void
  {
    this.log('putTemplate', params);
    const scriptParams: Elastic.PutScriptParams =
      {
        id: params.id,
        lang: 'mustache',
        body: params.body,
      };
    this.putScript(scriptParams, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-scroll
   */
  public scroll<T>(params: Elastic.ScrollParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    this.log('scroll', params);
    this.delegate.scroll(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-clearscroll
   */
  public clearScroll<T>(params: Elastic.ClearScrollParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    this.log('clearScroll', params);
    this.delegate.clearScroll(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search
   */
  public search<T>(params: Elastic.SearchParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    this.controller.prependIndexParam(params);
    this.modifySearchQuery(params.body);
    this.log('search', params);
    this.delegate.search(params, this.wrapCallback(callback, (res: Elastic.SearchResponse<T>) =>
    {
      res.hits.hits.forEach(this.controller.removeDocIndexPrefix.bind(this.controller));
    }));
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-msearch
   */
  public msearch<T>(params: Elastic.MSearchParams,
    callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void
  {
    const searches: any[] = params.body;
    for (let i = 0; i < searches.length; i += 2)
    {
      const searchHeader = searches[i];
      const searchBody = searches[i + 1];
      this.controller.prependIndexParam(searchHeader);
      this.modifySearchQuery(searchBody);
    }
    this.log('msearch', params);
    this.delegate.msearch(params, this.wrapCallback(callback, (res: Elastic.MSearchResponse<T>) =>
    {
      res.responses.forEach((res2) =>
      {
        res2.hits.hits.forEach(this.controller.removeDocIndexPrefix.bind(this.controller));
      });
    }));
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-msearchtemplate
   */
  public msearchTemplate<T>(params: Elastic.MSearchTemplateParams,
    callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void
  {
    this.log('msearchTemplate', params);
    throw new Error();
    // this.delegate.msearchTemplate(params, callback);
  }

  public getDelegate(): Elastic.Client
  {
    return this.delegate;
  }

  public getConfig(): ElasticConfig
  {
    return this.config;
  }

  public async isConnected(): Promise<boolean>
  {
    return new Promise<boolean>((resolve, reject) =>
    {
      this.controller.setStatus(DatabaseControllerStatus.CONNECTING);
      this.ping({}, (err: any, response) =>
      {
        if (err !== null && err !== undefined)
        {
          this.controller.setStatus(DatabaseControllerStatus.CONN_TIMEOUT);
          return resolve(false);
        }

        this.controller.setStatus(DatabaseControllerStatus.CONNECTED);
        resolve(true);
      });
    });
  }

  private log(methodName: string, info: any)
  {
    this.controller.log('ElasticClient.' + methodName, info);
  }

  private getHostFromConfig(): string
  {
    let host: string = this.getConfig().host;
    if (host === undefined)
    {
      if (this.getConfig().hosts !== undefined && this.getConfig().hosts.length > 0)
      {
        host = this.getConfig().hosts[0];
      }
    }

    if (host === undefined)
    {
      throw new Error('Unknown host');
    }

    if (host.substr(0, 4) !== 'http')
    {
      host = 'http://' + String(host);
    }

    return host;
  }

  private modifySearchQuery(body)
  {
    if (body.query && body.query.bool && body.query.bool.filter)
    {
      if (body.query.bool.filter.constructor === Array)
      {
        if (body.query.bool.filter.length > 0 && body.query.bool.filter[0].term && body.query.bool.filter[0].term._index)
        {
          this.controller.prependIndexTerm(body.query.bool.filter[0].term);
        }
      }
      else
      {
        if (body.query.bool.filter.term && body.query.bool.filter.term._index)
        {
          this.controller.prependIndexTerm(body.query.bool.filter.term);
        }
      }
    }
  }

  private wrapCallback(cb: (err, res) => void, f: (res) => void)
  {
    return (err, res) =>
    {
      if (err)
      {
        cb(err, undefined);
      }
      else
      {
        try
        {
          f(res);
        }
        catch (e)
        {
          this.log('error', e);
          return cb(e, undefined);
        }
        cb(err, res);
      }
    };
  }
}

export default ElasticClient;
