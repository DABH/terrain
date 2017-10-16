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

import csvWriter = require('csv-write-stream');
import sha1 = require('sha1');

import * as _ from 'lodash';
import * as stream from 'stream';
import * as winston from 'winston';

import * as SharedUtil from '../../../../shared/Util';
import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import { ItemConfig, Items } from '../items/Items';
import { ExportTemplateConfig, ExportTemplates } from './templates/ExportTemplates';
import { TemplateBase } from './templates/Templates';

const exportTemplates = new ExportTemplates();

const TastyItems: Items = new Items();
const typeParser: SharedUtil.CSVTypeParser = new SharedUtil.CSVTypeParser();

export interface ExportConfig extends TemplateBase, ExportTemplateConfig
{
  file: stream.Readable;
  filetype: string;
  update: boolean;      // false means replace (instead of update) ; default should be true
}

export class Export
{
  private BATCH_SIZE: number = 5000;
  private NUMERIC_TYPES: Set<string> = new Set(['byte', 'short', 'integer', 'long', 'half_float', 'float', 'double']);
  private SCROLL_TIMEOUT: string = '60s';

  public async export(exprt: ExportConfig, headless: boolean): Promise<stream.Readable | string>
  {
    return new Promise<stream.Readable | string>(async (resolve, reject) =>
    {
      const database: DatabaseController | undefined = DatabaseRegistry.get(exprt.dbid);
      if (database === undefined)
      {
        return reject('Database "' + exprt.dbid.toString() + '" not found.');
      }
      if (database.getType() !== 'ElasticController')
      {
        return reject('File export currently is only supported for Elastic databases.');
      }
      const elasticClient: ElasticClient = database.getClient() as ElasticClient;

      const dbSchema: Tasty.Schema = await database.getTasty().schema();

      if (exprt.filetype !== 'csv' && exprt.filetype !== 'json' && exprt.filetype !== 'json [type object]')
      {
        return reject('Filetype must be either CSV or JSON.');
      }
      if (exprt.filetype === 'json [type object]' && exprt.objectKey === undefined)
      {
        return reject('Must provide an object key if exporting in json [type object] format.');
      }
      if (headless)
      {
        // get a template given the template ID
        const templates: ExportTemplateConfig[] = await exportTemplates.get(exprt.templateId);
        if (templates.length === 0)
        {
          return reject('Template not found. Did you supply an export template ID?');
        }
        const template = templates[0] as object;
        if (exprt.dbid !== template['dbid'])
        {
          return reject('Template database ID does not match supplied database ID.');
        }
        for (const templateKey of Object.keys(template))
        {
          exprt[templateKey] = template[templateKey];
        }
      }

      let qry: string = '';
      // get query data from variantId or query
      if (exprt.variantId !== undefined && exprt.query === undefined)
      {
        const variants: ItemConfig[] = await TastyItems.get(exprt.variantId);
        if (variants.length === 0)
        {
          return reject('Variant not found.');
        }
        if (variants[0]['meta'] !== undefined)
        {
          const variantMeta: object = JSON.parse(variants[0]['meta'] as string);
          if (variantMeta['query'] !== undefined && variantMeta['query']['tql'] !== undefined)
          {
            qry = variantMeta['query']['tql'];
          }
        }
      }
      else if (exprt.variantId === undefined && exprt.query !== undefined)
      {
        qry = exprt.query;
      }
      else
      {
        return reject('Must provide either variant ID or query, not both or neither.');
      }
      if (qry === '')
      {
        return reject('Empty query provided.');
      }

      let qryObj: object;
      try
      {
        qryObj = JSON.parse(qry);
      }
      catch (e)
      {
        return reject(e);
      }

      if (qryObj['index'] === '')
      {
        return reject('Must provide an index.');
      }
      if (qryObj['index'] !== exprt['dbname'])
      {
        return reject('Query index name does not match supplied index name.');
      }
      const tableName: string = qryObj['type'] !== '' ? qryObj['type'] : undefined;
      let rankCounter: number = 1;
      let writer: any;
      if (exprt.filetype === 'csv')
      {
        writer = csvWriter();
      }
      else if (exprt.filetype === 'json' || exprt.filetype === 'json [type object]')
      {
        writer = new stream.PassThrough();
      }
      const pass = new stream.PassThrough();
      writer.pipe(pass);

      if (exprt.filetype === 'json' || exprt.filetype === 'json [type object]')
      {
        if (exprt.filetype === 'json [type object]')
        {
          writer.write('{ \"');
          writer.write(exprt.objectKey);
          writer.write('\":');
        }
        writer.write('[');
      }

      qryObj['scroll'] = this.SCROLL_TIMEOUT;
      let errMsg: string = '';
      let isFirstJSONObj: boolean = true;
      elasticClient.search(qryObj, async function getMoreUntilDone(err, resp)
      {
        if (resp.hits === undefined || resp.hits.total === 0)
        {
          writer.end();
          errMsg = 'Nothing to export.';
          return reject(errMsg);
        }
        const newDocs: object[] = resp.hits.hits as object[];
        if (newDocs.length === 0)
        {
          writer.end();
          return resolve(pass);
        }
        let returnDocs: object[] = [];

        const fieldArrayDepths: object = {};
        for (const doc of newDocs)
        {
          // verify schema mapping with documents and fix documents accordingly
          const newDoc: object | string = await this._checkDocumentAgainstMapping(doc['_source'], dbSchema, exprt.dbname, tableName);
          if (typeof newDoc === 'string')
          {
            writer.end();
            errMsg = newDoc;
            return reject(errMsg);
          }
          for (const field of Object.keys(newDoc))
          {
            if (newDoc[field] !== null && newDoc[field] !== undefined)
            {
              if (fieldArrayDepths[field] === undefined)
              {
                fieldArrayDepths[field] = new Set<number>();
              }
              fieldArrayDepths[field].add(this._getArrayDepth(newDoc[field]));
            }
            if (newDoc.hasOwnProperty(field) && Array.isArray(newDoc[field]) && exprt.filetype === 'csv')
            {
              newDoc[field] = this._convertArrayToCSVArray(newDoc[field]);
            }
          }
          returnDocs.push(newDoc as object);
        }
        for (const field of Object.keys(fieldArrayDepths))
        {
          if (fieldArrayDepths[field].size > 1)
          {
            errMsg = 'Export field "' + field + '" contains mixed types. You will not be able to re-import the exported file.';
            return reject(errMsg);
          }
        }

        // transform documents with template
        try
        {
          returnDocs = [].concat.apply([], await this._transformAndCheck(returnDocs, exprt, true));
          for (const doc of returnDocs)
          {
            if (exprt.rank === true)
            {
              if (doc['terrainRank'] !== undefined)
              {
                errMsg = 'Conflicting field: terrainRank.';
                return reject(errMsg);
              }
              doc['terrainRank'] = rankCounter;
            }
            rankCounter++;
          }
        } catch (e)
        {
          writer.end();
          errMsg = e;
          return reject(errMsg);
        }

        // export to csv
        for (const returnDoc of returnDocs)
        {
          if (exprt.filetype === 'csv')
          {
            writer.write(returnDoc);
          }
          else if (exprt.filetype === 'json' || exprt.filetype === 'json [type object]')
          {
            isFirstJSONObj === true ? isFirstJSONObj = false : writer.write(',\n');
            writer.write(JSON.stringify(returnDoc));
          }
        }
        if (Math.min(resp.hits.total, qryObj['size']) > rankCounter - 1)
        {
          elasticClient.scroll({
            scrollId: resp._scroll_id,
            scroll: this.SCROLL_TIMEOUT,
          }, getMoreUntilDone);
        }
        else
        {
          if (exprt.filetype === 'json' || exprt.filetype === 'json [type object]')
          {
            writer.write(']');
            if (exprt.filetype === 'json [type object]')
            {
              writer.write('}');
            }
          }
          writer.end();
          resolve(pass);
        }
      }.bind(this),
      );
    });
  }

  private _applyTransforms(obj: object, transforms: object[]): object
  {
    let colName: string | undefined;
    for (const transform of transforms)
    {
      switch (transform['name'])
      {
        case 'rename':
          const oldName: string | undefined = transform['colName'];
          const newName: string | undefined = transform['args']['newName'];
          if (oldName === undefined || newName === undefined)
          {
            throw new Error('Rename transformation must supply colName and newName arguments.');
          }
          if (oldName !== newName)
          {
            obj[newName] = obj[oldName];
            delete obj[oldName];
          }
          break;
        case 'split':
          const oldCol: string | undefined = transform['colName'];
          const newCols: string[] | undefined = transform['args']['newName'];
          const splitText: string | undefined = transform['args']['text'];
          if (oldCol === undefined || newCols === undefined || splitText === undefined)
          {
            throw new Error('Split transformation must supply colName, newName, and text arguments.');
          }
          if (newCols.length !== 2)
          {
            throw new Error('Split transformation currently only supports splitting into two columns.');
          }
          if (typeof obj[oldCol] !== 'string')
          {
            throw new Error('Can only split columns containing text.');
          }
          const oldText: string = obj[oldCol];
          delete obj[oldCol];
          const ind: number = oldText.indexOf(splitText);
          if (ind === -1)
          {
            obj[newCols[0]] = oldText;
            obj[newCols[1]] = '';
          }
          else
          {
            obj[newCols[0]] = oldText.substring(0, ind);
            obj[newCols[1]] = oldText.substring(ind + splitText.length);
          }
          break;
        case 'merge':
          const startCol: string | undefined = transform['colName'];
          const mergeCol: string | undefined = transform['args']['mergeName'];
          const newCol: string | undefined = transform['args']['newName'];
          const mergeText: string | undefined = transform['args']['text'];
          if (startCol === undefined || mergeCol === undefined || newCol === undefined || mergeText === undefined)
          {
            throw new Error('Merge transformation must supply colName, mergeName, newName, and text arguments.');
          }
          if (typeof obj[startCol] !== 'string' || typeof obj[mergeCol] !== 'string')
          {
            throw new Error('Can only merge columns containing text.');
          }
          obj[newCol] = String(obj[startCol]) + mergeText + String(obj[mergeCol]);
          if (startCol !== newCol)
          {
            delete obj[startCol];
          }
          if (mergeCol !== newCol)
          {
            delete obj[mergeCol];
          }
          break;
        case 'duplicate':
          colName = transform['colName'];
          const copyName: string | undefined = transform['args']['newName'];
          if (colName === undefined || copyName === undefined)
          {
            throw new Error('Duplicate transformation must supply colName and newName arguments.');
          }
          obj[copyName] = obj[colName];
          break;
        default:
          if (transform['name'] !== 'prepend' && transform['name'] !== 'append')
          {
            throw new Error('Invalid transform name encountered: ' + String(transform['name']));
          }
          colName = transform['colName'];
          const text: string | undefined = transform['args']['text'];
          if (colName === undefined || text === undefined)
          {
            throw new Error('Prepend/append transformation must supply colName and text arguments.');
          }
          if (typeof obj[colName] !== 'string')
          {
            throw new Error('Can only prepend/append to columns containing text.');
          }
          if (transform['name'] === 'prepend')
          {
            obj[colName] = text + String(obj[colName]);
          }
          else
          {
            obj[colName] = String(obj[colName]) + text;
          }
      }
    }
    return obj;
  }

  /* return the target hash an object with the specified field names and types should have
     * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _buildDesiredHash(nameToType: object): string
  {
    let strToHash: string = 'object';
    const nameToTypeArr: string[] = Object.keys(nameToType).sort();
    nameToTypeArr.forEach((name) =>
    {
      strToHash += '|' + name + ':' + this._buildDesiredHashHelper(nameToType[name]) + '|';
    });
    return sha1(strToHash);
  }
  /* recursive helper to handle arrays */

  private _buildDesiredHashHelper(typeObj: object): string
  {
    if (this.NUMERIC_TYPES.has(typeObj['type']))
    {
      return 'number';
    }
    if (typeObj['type'] === 'array')
    {
      return 'array-' + this._buildDesiredHashHelper(typeObj['innerType']);
    }
    return typeObj['type'];
  }

  private async _checkDocumentAgainstMapping(document: object, schema: Tasty.Schema,
    database: string, tableName: string): Promise<object | string>
  {
    return new Promise<object | string>(async (resolve, reject) =>
    {
      const newDocument: object = document;
      if (schema.tableNames(database).length === 0)
      {
        return resolve('Schema not found for database ' + database);
      }
      let tableNameArr: string[] = [];
      if (tableName !== undefined)
      {
        tableNameArr = [tableName];
      }
      else
      {
        tableNameArr = schema.tableNames(database);
      }
      for (const table of tableNameArr)
      {
        const fields: object = schema.fields(database, table);
        const fieldsInMappingNotInDocument: string[] = _.difference(Object.keys(fields), Object.keys(document));
        for (const field of fieldsInMappingNotInDocument)
        {
          newDocument[field] = null;
          // TODO: Case 740
          // if (fields[field]['type'] === 'text')
          // {
          //   newDocument[field] = '';
          // }
        }
        const fieldsInDocumentNotMapping = _.difference(Object.keys(newDocument), Object.keys(fields));
        for (const field of fieldsInDocumentNotMapping)
        {
          delete newDocument[field];
        }
      }
      resolve(newDocument);
    });
  }

  /* checks whether obj has the fields and types specified by nameToType
   * returns an error message if there is one; else returns empty string
   * nameToType: maps field name (string) to object (contains "type" field (string)) */
  private _checkTypes(obj: object, exprt: ExportConfig): string
  {
    if (exprt.filetype === 'json')
    {
      const targetHash: string = this._buildDesiredHash(exprt.columnTypes);
      const targetKeys: string = JSON.stringify(Object.keys(exprt.columnTypes).sort());

      // parse dates
      const dateColumns: string[] = [];
      for (const colName of Object.keys(exprt.columnTypes))
      {
        if (exprt.columnTypes.hasOwnProperty(colName) && this._getESType(exprt.columnTypes[colName]) === 'date')
        {
          dateColumns.push(colName);
        }
      }
      if (dateColumns.length > 0)
      {
        dateColumns.forEach((colName) =>
        {
          this._parseDatesHelper(obj, colName);
        });
      }

      if (this._hashObjectStructure(obj) !== targetHash)
      {
        if (JSON.stringify(Object.keys(obj).sort()) !== targetKeys)
        {
          return 'Encountered an object that does not have the set of specified keys: ' + JSON.stringify(obj);
        }
        for (const key of Object.keys(obj))
        {
          if (obj.hasOwnProperty(key))
          {
            if (!this._jsonCheckTypesHelper(obj[key], exprt.columnTypes[key]))
            {
              return 'Encountered an object whose field "' + key + '"does not match the specified type (' +
                JSON.stringify(exprt.columnTypes[key]) + '): ' + JSON.stringify(obj);
            }
          }
        }
      }
    }
    else if (exprt.filetype === 'csv')
    {
      for (const name of Object.keys(exprt.columnTypes))
      {
        if (exprt.columnTypes.hasOwnProperty(name))
        {
          if (!this._csvCheckTypesHelper(obj, exprt.columnTypes[name], name))
          {
            return 'Encountered an object whose field "' + name + '"does not match the specified type (' +
              JSON.stringify(exprt.columnTypes[name]) + '): ' + JSON.stringify(obj);
          }
        }
      }
    }

    // check that all elements of arrays are of the same type
    for (const field of Object.keys(exprt.columnTypes))
    {
      if (exprt.columnTypes[field]['type'] === 'array')
      {
        if (obj[field] !== null && !SharedUtil.isTypeConsistent(obj[field]))
        {
          return 'Array in field "' + field + '" of the following object contains inconsistent types: ' + JSON.stringify(obj);
        }
      }
    }

    for (const key of exprt.primaryKeys)
    {
      if (obj[key] === '' || obj[key] === null)
      {
        return 'Encountered an object with an empty primary key ("' + key + '"): ' + JSON.stringify(obj);
      }
    }

    return '';
  }

  private _convertArrayToCSVArray(arr: any[]): string
  {
    return JSON.stringify(arr);
  }

  /* parses string input from CSV and checks against expected types ; handles arrays recursively */
  private _csvCheckTypesHelper(item: object, typeObj: object, field: string): boolean
  {
    switch (this.NUMERIC_TYPES.has(typeObj['type']) ? 'number' : typeObj['type'])
    {
      case 'number':
        if (item[field] === '' || item[field] === 'null')
        {
          item[field] = null;
        }
        else
        {
          const parsedValue: number | boolean = typeParser.getDoubleFromString(String(item[field]));
          if (typeof parsedValue === 'number')
          {
            item[field] = parsedValue;
            return true;
          }
          return false;
        }
        break;
      case 'boolean':
        if (item[field] === 'true')
        {
          item[field] = true;
        }
        else if (item[field] === 'false')
        {
          item[field] = false;
        }
        else if (item[field] === '')
        {
          item[field] = null;
        }
        else
        {
          return false;
        }
        break;
      case 'date':
        const date: number = Date.parse(item[field]);
        if (!isNaN(date))
        {
          item[field] = new Date(date);
        }
        else if (item[field] === '')
        {
          item[field] = null;
        }
        else
        {
          return false;
        }
        break;
      case 'array':
        if (item[field] === '')
        {
          item[field] = null;
        }
        else
        {
          try
          {
            if (typeof item[field] === 'string')
            {
              item[field] = JSON.parse(item[field]);
            }
          } catch (e)
          {
            return false;
          }
          if (!Array.isArray(item[field]))
          {
            return false;
          }
          let i: number = 0;
          while (i < Object.keys(item[field]).length)    // lint hack to get around not recognizing item[field] as an array
          {
            if (!this._csvCheckTypesHelper(item[field], typeObj['innerType'], String(i)))
            {
              return false;
            }
            i++;
          }
        }
        break;
      default:  // "text" case, leave as string
    }
    return true;
  }

  /* assumes arrays are of uniform depth */
  private _getArrayDepth(obj: any): number
  {
    if (Array.isArray(obj))
    {
      return this._getArrayDepth(obj[0]) + 1;
    }
    return 0;
  }

  /* return ES type from type specification format of ImportConfig
   * typeObject: contains "type" field (string), and "innerType" field (object) in the case of array/object types */
  private _getESType(typeObject: object, withinArray: boolean = false): string
  {
    switch (typeObject['type'])
    {
      case 'array':
        return this._getESType(typeObject['innerType'], true);
      case 'object':
        return withinArray ? 'nested' : 'object';
      default:
        return typeObject['type'];
    }
  }

  private _getObjectStructureStr(payload: object): string
  {
    let structStr: string = SharedUtil.getType(payload);
    if (structStr === 'object')
    {
      structStr = Object.keys(payload).sort().reduce((res, item) =>
      {
        res += '|' + item + ':' + this._getObjectStructureStr(payload[item]) + '|';
        return res;
      },
        structStr);
    }
    else if (structStr === 'array')
    {
      if (Object.keys(structStr).length > 0)
      {
        structStr += '-' + this._getObjectStructureStr(payload[0]);
      }
      else
      {
        structStr += '-empty';
      }
    }
    return structStr;
  }

  /* returns a hash based on the object's field names and data types
   * handles object fields recursively ; only checks the type of the first element of arrays */
  private _hashObjectStructure(payload: object): string
  {
    return sha1(this._getObjectStructureStr(payload));
  }

  /* manually checks types (rather than checking hashes) ; handles arrays recursively */
  private _jsonCheckTypesHelper(item: object, typeObj: object): boolean
  {
    const thisType: string = SharedUtil.getType(item);
    if (thisType === 'null')
    {
      return true;
    }
    if (thisType === 'number' && this.NUMERIC_TYPES.has(typeObj['type']))
    {
      return true;
    }
    if (typeObj['type'] !== thisType)
    {
      return false;
    }
    if (thisType === 'array')
    {
      if (item[0] === undefined)
      {
        return true;
      }
      return this._jsonCheckTypesHelper(item[0], typeObj['innerType']);
    }
    return true;
  }

  /* recursively attempts to parse strings to dates */
  private _parseDatesHelper(item: string | object, field: string)
  {
    if (Array.isArray(item[field]))
    {
      let i: number = 0;
      while (i < Object.keys(item[field]).length)   // lint hack to get around not recognizing item[field] as an array
      {
        this._parseDatesHelper(item[field], String(i));
        i++;
      }
    }
    else
    {
      const date: number = Date.parse(item[field]);
      if (!isNaN(date))
      {
        item[field] = new Date(date);
      }
    }
  }

  /* asynchronously perform transformations on each item to upsert, and check against expected resultant types */
  private async _transformAndCheck(allItems: object[], exprt: ExportConfig,
    dontCheck?: boolean): Promise<object[][]>
  {
    const promises: Array<Promise<object[]>> = [];
    let items: object[];
    while (allItems.length > 0)
    {
      items = allItems.splice(0, this.BATCH_SIZE);
      promises.push(
        new Promise<object[]>(async (thisResolve, thisReject) =>
        {
          const transformedItems: object[] = [];
          for (let item of items)
          {
            try
            {
              item = this._applyTransforms(item, exprt.transformations);
            } catch (e)
            {
              return thisReject('Failed to apply transforms: ' + String(e));
            }
            // only include the specified columns ; NOTE: unclear if faster to copy everything over or delete the unused ones
            const trimmedItem: object = {};
            for (const name of Object.keys(exprt.columnTypes))
            {
              if (exprt.columnTypes.hasOwnProperty(name))
              {
                if (typeof item[name] === 'string')
                {
                  trimmedItem[name] = item[name].replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                }
                else
                {
                  trimmedItem[name] = item[name];
                }
              }
            }
            if (dontCheck !== true)
            {
              const typeError: string = this._checkTypes(trimmedItem, exprt);
              if (typeError !== '')
              {
                return thisReject(typeError);
              }
            }
            transformedItems.push(trimmedItem);
          }
          thisResolve(transformedItems);
        }));
    }
    return Promise.all(promises);
  }
}

export default Export;
