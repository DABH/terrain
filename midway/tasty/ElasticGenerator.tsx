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

import * as SQLGenerator from './SQLGenerator';
import TastyNode from './TastyNode';
import TastyQuery from './TastyQuery';

export default class ElasticGenerator
{
  public static generate(query: TastyQuery)
  {
    return new ElasticGenerator(query).queryObject;
  }

  private queryObject: any;
  private tableName: string;

  constructor(query: TastyQuery)
  {
    this.queryObject = {};
    this.tableName = query.table._tastyTableName;

    // set table (index) name
    this.queryObject.index = this.tableName;

    // from clause
    if (query.numSkipped !== 0)
    {
      this.queryObject['from'] = query.numSkipped;
    }

    // size clause
    if (query.numTaken !== 0)
    {
      this.queryObject['size'] = query.numTaken;
    }

    // stored_fields clause
    if (!query.isSelectingAll())
    {
      const storedFields = this.getSubclauseList(this.queryObject, 'stored_fields');
      for (let i = 0; i < query.selected.length; ++i)
      {
        const column = query.selected[i];
        const columnName = this.getColumnName(column);
        storedFields.push(columnName);
      }
    }

    if (query.aliases.length !== 0)
    {
      throw new Error('Aliases are not yet supported by ElasticGenerator.');
    }

    // filter clause
    if (query.filters.length > 0)
    {
      const filterClause = this.getNestedSubclauseObject(this.queryObject, 'query', 'filter');
      for (let i = 0; i < query.filters.length; ++i)
      {
        const filter = query.filters[i];
        this.accumulateFilters(filterClause, filter);
      }
    }

    // sort clause
    if (query.sorts.length > 0)
    {
      const sortClause = this.getSubclauseList(this.queryObject, 'sort');

      for (let i = 0; i < query.sorts.length; ++i)
      {
        const sort = query.sorts[i];

        const clause = new Object();
        const column = this.getColumnName(sort.node);
        clause[column] = (sort.order === 'asc' ? 'asc' : 'desc');

        sortClause.push(clause);
      }
    }
  }

  private accumulateFilters(filterClause: object, expression: TastyNode)
  {
    // https://www.elastic.co/guide/en/elasticsearch/guide/current/combining-filters.html#bool-filter
    // currently only supports the basic operators, with the column on the lhs, as well as && and ||

    if (expression.numChildren !== 2)
    {
      throw new Error('Filtering on non-binary expression "' + JSON.stringify(expression) + '".');
    }

    // NB: could be made to accept the column on the rhs too, but currently only supports column on lhs
    const columnName = this.getColumnName(expression.lhs);
    const value = expression.rhs.value; // could be checked for validity

    if (expression.type === '==')
    {
      this.addFilterTerm(filterClause, 'bool', 'must', columnName, value);
    }
    else if (expression.type === '!=')
    {
      this.addFilterTerm(filterClause, 'bool', 'must_not', columnName, value);
    }
    else if (expression.type === '<')
    {
      this.setRangeClauseIfLesser(filterClause, columnName, 'lt', value);
    }
    else if (expression.type === '<=')
    {
      this.setRangeClauseIfLesser(filterClause, columnName, 'lte', value);
    }
    else if (expression.type === '>')
    {
      this.setRangeClauseIfGreater(filterClause, columnName, 'gt', value);
    }
    else if (expression.type === '>=')
    {
      this.setRangeClauseIfGreater(filterClause, columnName, 'gte', value);
    }
    else if (expression.type === '&&')
    {
      this.accumulateFilters(filterClause, expression.lhs);
      this.accumulateFilters(filterClause, expression.rhs);
    }
    else if (expression.type === '||')
    {
      const shouldClause = this.getSubclauseList(filterClause, 'should');
      this.accumulateFilters(shouldClause, expression.lhs);
      this.accumulateFilters(shouldClause, expression.rhs);
    }
    else
    {
      throw new Error('Filtering on unsupported expression "' + JSON.stringify(expression) + '".');
    }
  }

  private getSubclauseList(parentClause: {}, clauseName: string)
  {
    if (!(clauseName in parentClause))
    {
      parentClause[clauseName] = [];
    }
    return parentClause[clauseName];
  }

  private getSubclauseObject(parentClause: {}, clauseName: string)
  {
    if (!(clauseName in parentClause))
    {
      parentClause[clauseName] = {};
    }
    return parentClause[clauseName];
  }

  private getNestedSubclauseObject(parentClause: object, clauseName: string, subclauseName: string)
  {
    const clause = this.getSubclauseObject(parentClause, clauseName);
    return this.getSubclauseObject(clause, subclauseName);
  }

  private getNestedSubclauseList(parentClause: object, clauseName: string, subclauseName: string)
  {
    const clause = this.getSubclauseObject(parentClause, clauseName);
    return this.getSubclauseList(clause, subclauseName);
  }

  private setRangeClauseIfLesser(filterClause: object, columnName: string, filterOperator: string, value: any)
  {
    const columnClause = this.getNestedSubclauseObject(filterClause, 'range', columnName);
    if (!(filterOperator in columnClause) || value < columnClause[filterOperator])
    {
      columnClause[filterOperator] = value;
    }
  }

  private setRangeClauseIfGreater(filterClause: object, columnName: string, filterOperator: string, value: any)
  {
    const columnClause = this.getNestedSubclauseObject(filterClause, 'range', columnName);
    if (!(filterOperator in columnClause) || value > columnClause[filterOperator])
    {
      columnClause[filterOperator] = value;
    }
  }

  private addFilterTerm(filterClause: object, clause: string, subclause: string, columnName: string, value: any)
  {
    const sc = this.getNestedSubclauseList(filterClause, clause, subclause);
    const termKVP = new Object();
    termKVP[columnName] = value;
    sc.push({term: termKVP});
  }

  private getColumnName(expression: TastyNode)
  {
    if (expression.type !== '.' || expression.numChildren !== 2)
    {
      throw new Error('Could not find column name in expression "' + JSON.stringify(expression) + '".');
    }

    const table = expression.lhs;
    const column = expression.rhs;

    if (table.type !== 'reference')
    {
      throw new Error('Could not find table name in expression "' + JSON.stringify(expression) + '".');
    }
    if (table.value !== this.tableName)
    {
      throw new Error('Filter expression filters on something other than the queried table "' +
        JSON.stringify(expression) + '".');
    }

    if (column.type !== 'reference')
    {
      throw new Error('Could not find column name in expression "' + JSON.stringify(expression) + '".');
    }

    return column.value;
  }
}
