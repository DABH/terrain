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

import DatabaseController from '../database/DatabaseController';
import TastyColumn from './TastyColumn';
import TastyExecutor from './TastyExecutor';
import TastyGenerator from './TastyGenerator';
import TastyNode from './TastyNode';
import TastyQuery from './TastyQuery';
import TastySchema from './TastySchema';
import TastyTable from './TastyTable';

/**
 * Tasty Query components.
 */
export const Column = TastyColumn;
export type Column = TastyColumn;

export const Query = TastyQuery;
export type Query = TastyQuery;

export const Table = TastyTable;
export type Table = TastyTable;

/**
 * The core Tasty executor client.
 *
 * @export
 * @class Tasty
 */
export class Tasty
{
  private controller: DatabaseController;
  private generator: TastyGenerator;
  private executor: TastyExecutor;

  /**
   * Creates an instance of Tasty.
   */
  public constructor(controller: DatabaseController,
    executor: TastyExecutor,
    generator: TastyGenerator)
  {
    this.controller = controller;
    this.executor = executor;
    this.generator = generator;
  }

  public getGenerator(): TastyGenerator
  {
    return this.generator;
  }

  public getExecutor(): TastyExecutor
  {
    return this.executor;
  }

  /**
   * Execute a query.
   *
   * @param {TastyQuery | string} query The Tasty Query to execute.
   * @returns {Promise<object[]>} Returns a promise that would return a list of objects.
   *
   * @memberOf TastyInterface
   */
  public async execute(query: TastyQuery | string): Promise<object[]>
  {
    if (typeof query === 'string')
    {
      return await this.executor.query(query);
    }
    else
    {
      const queryString = this.generator.generate(query);
      return await this.executor.query(queryString);
    }
  }

  /**
   * Destroy an instance of Tasty.
   *
   * @returns {Promise<void>}
   *
   * @memberOf Tasty
   */
  public async destroy(): Promise<void>
  {
    return await this.executor.destroy();
  }

  /**
   * select: Retrieve an object from the table.
   *
   * @param {TastyTable} table A Tasty Table
   * @param {string[]} columns List of columns to select
   * @param {object) filter A filter object populated with keys corresponding to table
   *                        columns and values to filter on.
   *
   * @returns {Promise<object[]>}
   *
   * @memberOf TastyInterface
   */
  public async select(table: TastyTable, columns?: string[], filter?: object): Promise<object[]>
  {
    const query = new TastyQuery(table);
    if (columns === undefined || columns.length === 0)
    {
      columns = table.getColumnNames();
    }

    const selectedColumns = columns.map((col) => table[col]);
    query.select(selectedColumns);

    try
    {
      const node: TastyNode = this.filterColumns(table, filter);
      if (node)
      {
        query.filter(node);
      }

      const queryString = this.generator.generate(query);
      return await this.executor.query(queryString);
    }
    catch (e)
    {
      throw (e);
    }
  }

  /**
   * Update or insert an object or a list of objects.
   *
   * @param {TastyTable} table The table to upsert the object in.
   * @param {(object | object[])} obj An object or a list of objects to upsert.
   * @returns {Promise<object[]>}
   *
   * @memberOf TastyInterface
   */
  public async upsert(table: TastyTable, obj: object | object[]): Promise<object[]>
  {
    const query = new TastyQuery(table);
    if (obj instanceof Array)
    {
      const promises = [];
      obj.map(
        (o) =>
        {
          promises.push(this.upsert(table, o));
        });
      return await Promise.all(promises);
    }
    else
    {
      query.upsert(obj);
    }
    const queryString = this.generator.generate(query);
    return await this.executor.query(queryString);
  }

  /**
   * Delete an object or a list of objects based on their primary keys.
   *
   * To delete all of the rows in a table, use '*'.
   *
   * @param {TastyTable} table The table to delete an object from.
   * @param {(object | object[] | string)} obj  An object or a list of objects to delete.
   * @returns {Promise<object[]>}
   *
   * @memberOf TastyInterface
   */
  public async delete(table: TastyTable, obj: object | object[] | string): Promise<object[]>
  {
    const query = new TastyQuery(table);
    if (typeof obj === 'string' && obj === '*')
    {
      query.delete();
    }
    else if (obj instanceof Array)
    {
      const promises = [];
      obj.map(
        (o) =>
        {
          promises.push(this.upsert(table, o));
        });
      return await Promise.all(promises);
    }
    else if (typeof obj === 'object')
    {
      const node: TastyNode = this.filterColumns(table, obj);
      query.filter(node);
      query.delete();
    }
    const queryString = this.generator.generate(query);
    return await this.executor.query(queryString);
  }

  public async schema(): Promise<TastySchema>
  {
    return this.executor.schema();
  }

  private filterColumns(table: TastyTable, obj: object): TastyNode
  {
    let node: TastyNode = null;
    const columns = table.getColumnNames();

    columns.map((col) =>
    {
      if (obj[col] !== undefined)
      {
        if (node === null)
        {
          node = table[col].equals(obj[col]);
        }
        else
        {
          node = node.and(table[col].equals(obj[col]));
        }
      }
    });
    return node;
  }
}

export default Tasty;
