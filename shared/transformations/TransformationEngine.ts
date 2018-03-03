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

import arrayTypeOfValues = require('array-typeof-values');
import GraphLib = require('graphlib');
import { List, Map } from 'immutable';
import isPrimitive = require('is-primitive');
import * as _ from 'lodash';
import objectify from '../util/deepObjectify';
import { KeyPath, keyPathPrefixMatch, updateKeyPath } from '../util/KeyPath';
import * as yadeep from '../util/yadeep';
// import * as winston from 'winston'; // TODO what to do for error logging?
import TransformationNode from './nodes/TransformationNode';
import TransformationEngineNodeVisitor from './TransformationEngineNodeVisitor';
import { TransformationInfo } from './TransformationInfo';
import TransformationNodeType from './TransformationNodeType';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

const Graph = GraphLib.Graph;

export class TransformationEngine
{
  public static load(json: object | string): TransformationEngine
  {
    const parsedJSON: object = typeof json === 'string' ? TransformationEngine.parseSerializedString(json as string) : json as object;
    const e: TransformationEngine = new TransformationEngine();
    const dag: any = GraphLib.json.read(parsedJSON['dag']);
    e.dag = dag;
    e.doc = parsedJSON['doc'];
    e.uidField = parsedJSON['uidField'];
    e.uidNode = parsedJSON['uidNode'];
    e.fieldNameToIDMap = Map<KeyPath, number>(parsedJSON['fieldNameToIDMap']);
    e.IDToFieldNameMap = Map<number, KeyPath>(parsedJSON['IDToFieldNameMap']);
    e.fieldTypes = Map<number, string>(parsedJSON['fieldTypes']);
    e.fieldEnabled = Map<number, boolean>(parsedJSON['fieldEnabled']);
    e.fieldProps = Map<number, object>(parsedJSON['fieldProps']);
    return e;
  }

  private static parseSerializedString(s: string): object
  {
    const parsed: object = JSON.parse(s);
    parsed['fieldNameToIDMap'] = parsed['fieldNameToIDMap'].map((v) => [KeyPath(v[0]), v[1]]);
    parsed['IDToFieldNameMap'] = parsed['IDToFieldNameMap'].map((v) => [v[0], KeyPath(v[1])]);
    for (let i: number = 0; i < parsed['dag']['nodes'].length; i++)
    {
      const raw: object = parsed['dag']['nodes'][i]['value'];
      parsed['dag']['nodes'][i]['value'] =
        new (TransformationInfo.getType(raw['typeCode']))(
          raw['id'],
          List<number>(raw['fieldIDs']),
          raw['options'],
          raw['typeCode'],
        ) as TransformationNode;
    }
    return parsed;
  }

  private dag: any = new Graph({ isDirected: true });
  private doc: object = {};
  private uidField: number = 0;
  private uidNode: number = 0;
  private fieldNameToIDMap: Map<KeyPath, number> = Map<KeyPath, number>();
  private IDToFieldNameMap: Map<number, KeyPath> = Map<number, KeyPath>();
  private fieldTypes: Map<number, string> = Map<number, string>();
  private fieldEnabled: Map<number, boolean> = Map<number, boolean>();
  private fieldProps: Map<number, object> = Map<number, object>();

  constructor(doc?: object)
  {
    if (doc !== undefined)
    {
      this.doc = Object.assign({}, doc);
      this.generateInitialFieldMaps(this.doc); // TODO can't return ID list here... disable this or what?
      // initial field nodes can be implicit, DAG should only represent actual transformations
    }
    // allow construction without example doc (manually add fields)
  }

  /**
   * Checks whether a provides `TransformationEngine` is equal to the current `TransformationEngine` (`this`).
   * Performs a "deep equals" due to the complex nature of this type.
   *
   * NOTE: This feels rather inefficient and should be optimized in the future if it's used frequently
   *       (for example, if many checks are misses, then consider using a hash code comparison first).
   *       Currently this is only used for testing.
   *
   * @param {TransformationEngine} other The `TransformationEngine` against which to compare
   * @returns {boolean} Whether `this` is the same as `other`
   */
  public equals(other: TransformationEngine): boolean
  {
    return JSON.stringify(GraphLib.json.write(this.dag)) === JSON.stringify(GraphLib.json.write(other.dag))
      && JSON.stringify(this.doc) === JSON.stringify(other.doc)
      && this.uidField === other.uidField
      && this.uidNode === other.uidNode
      && JSON.stringify(this.fieldNameToIDMap.map((v: number, k: KeyPath) => [k, v]).toArray()) ===
      JSON.stringify(other.fieldNameToIDMap.map((v: number, k: KeyPath) => [k, v]).toArray())
      && JSON.stringify(this.IDToFieldNameMap.map((v: KeyPath, k: number) => [k, v]).toArray()) ===
      JSON.stringify(other.IDToFieldNameMap.map((v: KeyPath, k: number) => [k, v]).toArray())
      && JSON.stringify(this.fieldTypes.map((v: string, k: number) => [k, v]).toArray()) ===
      JSON.stringify(other.fieldTypes.map((v: string, k: number) => [k, v]).toArray())
      && JSON.stringify(this.fieldEnabled.map((v: boolean, k: number) => [k, v]).toArray()) ===
      JSON.stringify(other.fieldEnabled.map((v: boolean, k: number) => [k, v]).toArray())
      && JSON.stringify(this.fieldProps.map((v: object, k: number) => [k, v]).toArray()) ===
      JSON.stringify(other.fieldProps.map((v: object, k: number) => [k, v]).toArray());
  }

  public appendTransformation(nodeType: TransformationNodeType, fieldNamesOrIDs: List<KeyPath> | List<number>,
    options?: object, tags?: string[], weight?: number): number
  {
    const fieldIDs: List<number> = this.parseFieldIDs(fieldNamesOrIDs);
    const node: TransformationNode =
      new (TransformationInfo.getType(nodeType))(this.uidNode, fieldIDs, options, nodeType);
    this.dag.setNode(this.uidNode.toString(), node);
    this.uidNode++;
    return this.uidNode - 1;
  }

  public transform(doc: object): object
  {
    let output: object = this.flatten(doc);
    for (const nodeKey of this.dag.sources())
    {
      const toTraverse: string[] = GraphLib.alg.preorder(this.dag, nodeKey);
      for (let i = 0; i < toTraverse.length; i++)
      {
        const visitor: TransformationEngineNodeVisitor = new TransformationEngineNodeVisitor();
        const transformationResult: TransformationVisitResult =
          visitor.applyTransformationNode(this.dag.node(toTraverse[i]), output);
        if (transformationResult.errors !== undefined)
        {
          // winston.error('Transformation encountered errors!:');
          transformationResult.errors.forEach((error: TransformationVisitError) =>
          {
            // winston.error(`\t -${error.message}`);
          });
          // TODO abort transforming if errors occur?
        }
        output = transformationResult.document;
      }
    }
    return this.unflatten(output);
  }

  public toJSON(): object
  {
    return {
      dag: GraphLib.json.write(this.dag),
      doc: this.doc,
      uidField: this.uidField,
      uidNode: this.uidNode,
      fieldNameToIDMap: this.fieldNameToIDMap.map((v: number, k: KeyPath) => [k, v]).toArray(),
      IDToFieldNameMap: this.IDToFieldNameMap.map((v: KeyPath, k: number) => [k, v]).toArray(),
      fieldTypes: this.fieldTypes.map((v: string, k: number) => [k, v]).toArray(),
      fieldEnabled: this.fieldEnabled.map((v: boolean, k: number) => [k, v]).toArray(),
      fieldProps: this.fieldProps.map((v: object, k: number) => [k, v]).toArray(),
    };
  }

  public addField(fullKeyPath: KeyPath, typeName: string, options: object = {}): number
  {
    this.fieldNameToIDMap = this.fieldNameToIDMap.set(fullKeyPath, this.uidField);
    this.IDToFieldNameMap = this.IDToFieldNameMap.set(this.uidField, fullKeyPath);
    this.fieldTypes = this.fieldTypes.set(this.uidField, typeName);
    this.fieldEnabled = this.fieldEnabled.set(this.uidField, true);
    this.fieldProps = this.fieldProps.set(this.uidField, options);

    this.uidField++;
    return this.uidField - 1;
  }

  public getTransformations(field: KeyPath | number): List<number>
  {
    const target: number = typeof field === 'number' ? field : this.fieldNameToIDMap.get(field);
    const nodes: TransformationNode[] = [];
    _.each(this.dag.nodes(), (node) =>
    {
      if ((this.dag.node(node) as TransformationNode).fieldIDs.includes(target))
      {
        nodes.push(this.dag.node(node) as TransformationNode);
      }
    });
    // Need to order nodes...
    const allSorted = GraphLib.alg.topsort(this.dag);
    let nodesSorted: List<number> = List<number>();
    for (let i: number = 0; i < allSorted.length; i++)
    {
      if (nodes.includes(this.dag.node(allSorted[i])))
      {
        nodesSorted = nodesSorted.push(parseInt(allSorted[i], 10));
      }
    }
    return nodesSorted;
  }

  public getTransformationInfo(transformationID: number): TransformationNode | undefined
  {
    if (!this.dag.nodes().includes(transformationID.toString()))
    {
      return undefined;
    }
    return this.dag.node(transformationID.toString()) as TransformationNode;
  }

  public editTransformation(transformationID: number, fieldNamesOrIDs?: List<KeyPath> | List<number>,
    options?: object): void
  {
    if (!this.dag.nodes().includes(transformationID.toString()))
    {
      return;
    }

    if (fieldNamesOrIDs !== undefined)
    {
      (this.dag.node(transformationID) as TransformationNode).fieldIDs = this.parseFieldIDs(fieldNamesOrIDs);
    }

    if (options !== undefined)
    {
      (this.dag.node(transformationID) as TransformationNode).meta = options;
    }
  }

  public deleteTransformation(transformationID: number): void
  {
    this.dag.removeNode(transformationID);
    // TODO need to handle case where transformation is not at the top of the stack (add new edges etc.)
  }

  public setInputKeyPath(fieldID: number, newKeyPath: KeyPath, source?: any): void
  {
    const oldName: KeyPath = this.fieldNameToIDMap.keyOf(fieldID);
    this.fieldNameToIDMap.forEach((id: number, field: KeyPath) =>
    {
      if (keyPathPrefixMatch(field, oldName))
      {
        this.fieldNameToIDMap = this.fieldNameToIDMap.delete(oldName);
        this.fieldNameToIDMap = this.fieldNameToIDMap.set(updateKeyPath(field, oldName, newKeyPath), id);
      }
    });
  }

  public setOutputKeyPath(fieldID: number, newKeyPath: KeyPath, dest?: any): void
  {
    const oldName: KeyPath = this.IDToFieldNameMap.get(fieldID);
    this.IDToFieldNameMap.forEach((field: KeyPath, id: number) =>
    {
      if (keyPathPrefixMatch(field, oldName))
      {
        this.IDToFieldNameMap = this.IDToFieldNameMap.set(id, updateKeyPath(field, oldName, newKeyPath));
      }
    });
  }

  public getInputKeyPath(fieldID: number): KeyPath
  {
    return this.fieldNameToIDMap.keyOf(fieldID);
  }

  public getOutputKeyPath(fieldID: number): KeyPath
  {
    return this.IDToFieldNameMap.get(fieldID);
  }

  public getFieldType(fieldID: number): string
  {
    return this.fieldTypes.get(fieldID);
  }

  public setFieldType(fieldID: number, typename: string): void
  {
    this.fieldTypes = this.fieldTypes.set(fieldID, typename);
  }

  public getFieldEnabled(fieldID: number): boolean
  {
    return this.fieldEnabled.get(fieldID) === true;
  }

  public getFieldProp(fieldID: number, prop: KeyPath): any
  {
    return yadeep.get(this.fieldProps.get(fieldID), prop);
  }

  public getFieldProps(fieldID: number): object
  {
    return this.fieldProps.get(fieldID);
  }

  public setFieldProps(fieldID: number, props: object): void
  {
    this.fieldProps = this.fieldProps.set(fieldID, props);
  }

  public setFieldProp(fieldID: number, prop: KeyPath, value: any): void
  {
    const newProps: object = this.fieldProps.get(fieldID);
    yadeep.set(newProps, prop, value, { create: true });
    this.fieldProps = this.fieldProps.set(fieldID, newProps);
  }

  public getAllFieldIDs(): List<number>
  {
    return this.IDToFieldNameMap.keySeq().toList();
  }

  public getAllFieldNames(): List<KeyPath>
  {
    return this.IDToFieldNameMap.valueSeq().toList();
  }

  public enableField(fieldID: number): void
  {
    this.fieldEnabled = this.fieldEnabled.set(fieldID, true);
  }

  public disableField(fieldID: number): void
  {
    this.fieldEnabled = this.fieldEnabled.set(fieldID, false);
  }

  private parseFieldIDs(fieldNamesOrIDs: List<KeyPath> | List<number>): List<number>
  {
    let ids: List<number> = List<number>();

    if (fieldNamesOrIDs.size > 0)
    {
      if (typeof fieldNamesOrIDs.first() === 'number')
      {
        ids = fieldNamesOrIDs as List<number>;
      }
      else
      {
        (fieldNamesOrIDs as List<KeyPath>).map((name: KeyPath) =>
        {
          // Replace wildcards with explicit field IDs
          if (name.contains('*'))
          {
            const upto: KeyPath = name.slice(0, name.indexOf('*')).toList();
            if (this.fieldNameToIDMap.has(upto))
            {
              for (let i: number = 0; i <= this.getFieldProp(this.fieldNameToIDMap.get(upto), KeyPath(['arrayLength'])); i++)
              {
                ids = ids.concat(this.parseFieldIDs(List<KeyPath>([name.set(name.indexOf('*'), i.toString())]))).toList();
              }
            }
          }
          else
          {
            // Fully explicit KeyPath now (no *'s)
            if (this.fieldNameToIDMap.has(name))
            {
              ids = ids.push(this.fieldNameToIDMap.get(name));
            }
          }
        });
      }
    }

    return ids;
  }

  private addPrimitiveField(ids: List<number>, obj: object, currentKeyPath: KeyPath, key: any): List<number>
  {
    return ids.push(this.addField(currentKeyPath.push(key.toString()), typeof obj[key]));
  }

  private addArrayField(ids: List<number>, obj: object, currentKeyPath: KeyPath, key: any): List<number>
  {
    // const arrayKey: any = [key.toString()];
    // const arrayID: number = this.addField(currentKeyPath.push(arrayKey), 'array');
    const arrayID: number = this.addField(currentKeyPath.push(key.toString()), 'array');
    ids = ids.push(arrayID);
    this.setFieldProp(arrayID, KeyPath(['valueType']), arrayTypeOfValues(obj[key]));
    this.setFieldProp(arrayID, KeyPath(['arrayLength']), obj[key].length);
    for (let i: number = 0; i < obj[key].length; i++)
    {
      // const arrayKey_i: any = arrayKey.push(i.toString());
      if (isPrimitive(obj[key][i]))
      {
        ids = this.addPrimitiveField(ids, obj[key], currentKeyPath.push(key.toString()), i);
        // ids = ids.push(this.addField(currentKeyPath.push(arrayKey_i), typeof obj[key]));
      } else if (Array.isArray(obj[key][i]))
      {
        ids = this.addArrayField(ids, obj[key], currentKeyPath.push(key.toString()), i);
      } else
      {
        ids = ids.push(this.addField(currentKeyPath.push(key).push(i.toString()), typeof obj[key][i]));
        ids = this.addObjectField(ids, obj[key][i], currentKeyPath.push(key.toString()).push(i.toString()));
      }
    }
    return ids;
  }

  private addObjectField(ids: List<number>, obj: object, currentKeyPath: KeyPath): List<number>
  {
    for (const key of Object.keys(obj))
    {
      if (isPrimitive(obj[key]))
      {
        ids = this.addPrimitiveField(ids, obj, currentKeyPath, key);
      } else if (obj[key].constructor === Array)
      {
        ids = this.addArrayField(ids, obj, currentKeyPath, key);
      } else
      {
        ids = ids.push(this.addField(currentKeyPath.push(key), typeof obj[key]));
        ids = this.addObjectField(ids, obj[key], currentKeyPath.push(key));
      }
    }
    return ids;
  }

  private generateInitialFieldMaps(obj: object, currentKeyPath: KeyPath = List<string>()): List<number>
  {
    let ids: List<number> = List<number>();
    ids = this.addObjectField(ids, obj, currentKeyPath);
    return ids;
  }

  private flatten(obj: object): object
  {
    const objectified: object = objectify(obj);
    const output: object = {};
    this.fieldNameToIDMap.map((value: number, keyPath: KeyPath) =>
    {
      const ref: any = yadeep.get(objectified, keyPath);
      if (ref !== undefined)
      {
        if (isPrimitive(ref))
        {
          output[value] = ref;
        }
        else
        {
          output[value] = Object.assign({}, ref);
        }
      }
    });
    return output;
  }

  private unflatten(obj: object): object
  {
    const output: object = {};
    this.IDToFieldNameMap.map((value: KeyPath, key: number) =>
    {
      if (obj !== undefined && obj.hasOwnProperty(key) && this.fieldEnabled.get(key) === true)
      {
        yadeep.set(output, value, obj[key], { create: true });
      }
    });
    // If a field is supposed to be arary but is an object in its flattened
    // representation, convert it back to an array
    this.IDToFieldNameMap.map((value: KeyPath, key: number) =>
    {
      if (obj !== undefined && obj.hasOwnProperty(key) && this.fieldEnabled.get(key) === true)
      {
        if (this.fieldTypes.get(key) === 'array')
        {
          const x = yadeep.get(output, value);
          x['length'] = Object.keys(x).length;
          yadeep.set(output, value, Array.prototype.slice.call(x), { create: true });
        }
      }
    });
    return output;
  }
}
