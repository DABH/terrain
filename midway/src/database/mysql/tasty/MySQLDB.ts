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

import * as mysql from 'mysql';
import TastyDB from '../../../tasty/TastyDB';
import TastyNodeTypes from '../../../tasty/TastyNodeTypes';
import TastyQuery from '../../../tasty/TastyQuery';
import TastySchema from '../../../tasty/TastySchema';
import TastyTable from '../../../tasty/TastyTable';
import { makePromiseCallback } from '../../../tasty/Utils';
import SQLGenerator from '../../SQLGenerator';
import MySQLClient from '../client/MySQLClient';

export class MySQLDB implements TastyDB
{
  private client: MySQLClient;

  constructor(client: MySQLClient)
  {
    this.client = client;
  }

  /**
   * Generates MySQL queries from TastyQuery objects.
   */
  public generate(query: TastyQuery): string[]
  {
    const generator = new SQLGenerator();
    if (query.command.tastyType === TastyNodeTypes.select || query.command.tastyType === TastyNodeTypes.delete)
    {
      generator.generateSelectQuery(query);
    }
    else if (query.command.tastyType === TastyNodeTypes.upsert && query.upserts.length > 0)
    {
      generator.generateUpsertQuery(query, query.upserts);
    }

    generator.accumulateStatement(generator.queryString);
    return generator.statements;
  }

  public generateString(query: TastyQuery): string
  {
    return this.generate(query).join('\n');
  }

  public async schema(): Promise<TastySchema>
  {
    const result = await this.execute(
      ['SELECT table_schema, table_name, column_name, data_type ' +
        'FROM information_schema.columns ' +
        'WHERE table_schema NOT IN (\'information_schema\', \'performance_schema\', \'mysql\', \'sys\');']);
    return TastySchema.fromMySQLResultSet(result);
  }

  /**
   * executes statements sequentially
   * @param statements
   * @returns {Promise<Array>} appended result objects
   */
  public async execute(statements: string[]): Promise<object[]>
  {
    let results: object[] = [];
    for (const statement of statements)
    {
      const result: object[] = await new Promise<object[]>((resolve, reject) =>
      {
        this.client.query(statement, makePromiseCallback(resolve, reject));
      });

      results = results.concat(result);
    }
    return results;
  }

  public async upsert(table: TastyTable, statements: string[], elements: object[]): Promise<object[]>
  {
    const primaryKeys = table.getPrimaryKeys();
    const upserted = await this.execute(statements);
    const results = new Array(upserted.length);
    for (let i = 0; i < results.length; i++)
    {
      results[i] = elements[i];
      if ((primaryKeys.length === 1) &&
        (elements[i][primaryKeys[0]] === undefined))
      {
        results[i][primaryKeys[0]] = upserted[i]['insertId'];
      }
    }

    return results;
  }

  public async destroy(): Promise<void>
  {
    return new Promise<void>((resolve, reject) =>
    {
      this.client.end(makePromiseCallback(resolve, reject));
    });
  }

  private async getConnection(): Promise<mysql.IConnection>
  {
    return new Promise<mysql.IConnection>((resolve, reject) =>
    {
      this.client.getConnection(makePromiseCallback(resolve, reject));
    });
  }
}

export default MySQLDB;
