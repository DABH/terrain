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

import * as elasticSearch from 'elasticsearch';
import TastySchema from './TastySchema';
import TastyTable from './TastyTable';

const defaultElasticConfig =
  {
    hosts: ['http://10.1.0.30:9200'],
  };

export default class ElasticExecutor
{
  private config;
  private client;

  constructor(config?: any)
  {
    if (config === undefined)
    {
      config = defaultElasticConfig;
    }

    this.config = config;
    this.client = new elasticSearch.Client(config);
  }

  public health()
  {
    return new Promise((resolve, reject) =>
    {
      this.client.cluster.health(
        {},
        this.makePromiseCallback(resolve, reject));
    });
  }

  public async schema()
  {
    const result: any = await this.client.indices.getMapping();
    return TastySchema.fromElasticTree(result);
  }

  /**
   * Returns the entire ES response object.
   */
  public fullQuery(queryObject: object)
  {
    return new Promise((resolve, reject) =>
    {
      this.client.search(
        queryObject,
        this.makePromiseCallback(resolve, reject));
    });
  }

  /**
   * returns only the query hits
   */
  public async query(queryObject: object)
  {
    const result: any = await this.fullQuery(queryObject);
    // if('body' in queryObject)
    // {
    //     let body = queryObject.body;
    //     if('aggregations' in body)
    //         return result.
    // }
    return result.hits;
  }

  public destroy()
  {
    this.client.close();
  }

  public async upsert(table: TastyTable, elements)
  {
    if (elements.length > 4)
    {
      await this.bulkUpsert(table, elements);
      return;
    }

    const promises = [];
    for (let i = 0; i < elements.length; ++i)
    {
      const element = elements[i];
      promises.push(
        new Promise((resolve, reject) =>
        {
          const query = {
            body:  element,
            id:    this.makeID(table, element),
            index: table.tastyTableName,
            type:  table.tastyTableName,
          };

          this.client.index(
            query,
            this.makePromiseCallback(resolve, reject));
        }));
    }

    for (const promise in promises)
    {
      if (promises.hasOwnProperty(promise))
      {
        await promise;
      }
    }
  }

  private bulkUpsert(table: TastyTable, elements)
  {
    const body = [];
    for (let i = 0; i < elements.length; ++i)
    {
      const element = elements[i];
      const command = {
        index: {
          _id:    this.makeID(table, element),
          _index: table.tastyTableName,
          _type:  table.tastyTableName,
        },
      };

      body.push(command);
      body.push(element);
    }

    return new Promise(
      (resolve, reject) =>
      {
        this.client.bulk(
          {
            body,
          },
          this.makePromiseCallback(resolve, reject));
      });
  }

  private makeID(table: TastyTable, element: object)
  {
    return table.getPrimaryKey(element).join('-');
  }

  private makePromiseCallback(resolve, reject)
  {
    return (error, response) =>
    {
      if (error)
      {
        reject(error);
      } else
      {
        resolve(response);
      }
    };
  }
}
