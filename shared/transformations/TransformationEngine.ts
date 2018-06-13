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
import * as GraphLib from 'graphlib';
import { List, Map } from 'immutable';
import isPrimitive = require('is-primitive');
import * as _ from 'lodash';
import objectify from '../util/deepObjectify';
import { KeyPath, keyPathPrefixMatch, updateKeyPath } from '../util/KeyPath';
import * as yadeep from '../util/yadeep';
// import * as winston from 'winston'; // TODO what to do for error logging?
import DataStore from './DataStore';
import TransformationNode from './nodes/TransformationNode';
import TransformationEngineNodeVisitor from './TransformationEngineNodeVisitor';
import { TransformationInfo } from './TransformationInfo';
import TransformationNodeType from './TransformationNodeType';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

/**
 * A TransformationEngine performs transformations on complex JSON documents.
 *
 * This is used by the ETL import/export system in order to pre-/post-process
 * data, but is a fairly general-purpose system for manipulating deep objects.
 *
 * A TransformationEngine can be initialized from an example document, or fields
 * can manually be registered with the engine.  In either case, once fields are
 * registered, transformations can be added (they are represented as a DAG;
 * transformations may have dependencies).  Once an engine is fully configured,
 * documents with the same/similar schemas may be transformed using the
 * engine's `transform` method.
 */
export class TransformationEngine
{
  public static datastore = new DataStore();

  /**
   * Creates a TransformationEngine from a serialized representation
   * (either a JSON object or stringified JSON object).
   *
   * @param {object | string} json   The serialized representation to
   *                                 deserialize into a working engine.
   * @returns {TransformationEngine} A deserialized, ready-to-go engine.
   */
  public static load(json: object | string): TransformationEngine
  {
    const parsedJSON: object = typeof json === 'string' ? TransformationEngine.parseSerializedString(json as string) : json as object;
    const e: TransformationEngine = new TransformationEngine();
    e.dag = GraphLib.json.read(parsedJSON['dag']);
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

  /**
   * A helper function to process a Transformation Node's meta object
   * from a raw JS object into an object whose newFieldKeyPaths field
   * is properly turned into an immutable list of keypaths
   *
   * @param {object} meta The deserialized meta object
   * @returns {object} The converted meta object
   */
  private static makeMetaImmutable(meta: object): object
  {
    if (meta['newFieldKeyPaths'] !== undefined)
    {
      const newFieldKeyPaths = List(meta['newFieldKeyPaths'])
        .map((val: string[]) => KeyPath(val)).toList();
      return _.extend({}, meta, {
        newFieldKeyPaths,
      });
    }
    else
    {
      return meta;
    }
  }

  /**
   * A helper function to parse a string representation of a
   * `TransformationEngine` into a working, fully-typed engine
   * (stringified JS objects lose all type information, so it
   * must be restored here...).
   *
   * @param {string} s The serialized string to parse into an engine.
   * @returns {object} An intermediate object that undergoes further
   *                   processing in `load` to finish converting
   *                   to a `TransformationEngine`.
   */
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
          List<KeyPath>(raw['fields'].map((item) => KeyPath(item))),
          TransformationEngine.makeMetaImmutable(raw['meta']),
          raw['typeCode'],
        ) as TransformationNode;
    }
    return parsed;
  }

  private dag: GraphLib.Graph = new GraphLib.Graph({ directed: true });
  private doc: object = {};
  private uidField: number = 0;
  private uidNode: number = 0;
  private fieldNameToIDMap: Map<KeyPath, number> = Map<KeyPath, number>();
  private IDToFieldNameMap: Map<number, KeyPath> = Map<number, KeyPath>();
  private fieldTypes: Map<number, string> = Map<number, string>();
  private fieldEnabled: Map<number, boolean> = Map<number, boolean>();
  private fieldProps: Map<number, object> = Map<number, object>();

  /**
   * Constructor for `TransformationEngine`.
   *
   * @param {object} doc An optional example document that, if
   *                     passed, is used to generate initial
   *                     field IDs and mappings
   */
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

  public clone(): TransformationEngine
  {
    return TransformationEngine.load(this.toJSON());
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
    // Note: dealing with a lot of Immutable data structures so some
    // slightly verbose syntax is required to convert to plain JS arrays
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

  /**
   * This is the method by which one adds transformations to the engine.  Use
   * after adding the relevant fields to the engine.  The transformation is
   * appended to the engine's transformation DAG in the appropriate place.
   *
   * @param {TransformationNodeType} nodeType    The type of transformation to create
   * @param {Immutable.List<KeyPath>} fieldNames A list of field names (not IDs)
   *                                             on which to apply the new transformation
   * @param {object} options                     Any options for the transformation;
   *                                             different transformation types have
   *                                             various specialized options available
   * @param {string[]} tags                      Any special tags for the node in the DAG
   * @param {number} weight                      A weight for new edges in the DAG
   * @returns {number}                           The ID of the newly-created transformation
   */
  public appendTransformation(nodeType: TransformationNodeType, fieldNames: List<KeyPath>,
    options?: object, tags?: string[], weight?: number): number
  {
    // const fieldIDs: List<number> = this.parseFieldIDs(fieldNamesOrIDs);
    const node: TransformationNode =
      new (TransformationInfo.getType(nodeType))(this.uidNode, fieldNames, options, nodeType);

    // Process fields created/disabled by this transformation
    if (options !== undefined)
    {
      if (options['newFieldKeyPaths'] !== undefined)
      {
        for (let i: number = 0; i < options['newFieldKeyPaths'].size; i++)
        {
          let inferredTypeNameOfNewFields: string;
          if (TransformationInfo.getNewFieldType(nodeType) === 'same' && fieldNames.size > 0)
          {
            inferredTypeNameOfNewFields = this.getFieldType(this.getInputFieldID(fieldNames.get(0)));
          }
          else if (TransformationInfo.getNewFieldType(nodeType))
          {
            inferredTypeNameOfNewFields = TransformationInfo.getNewFieldType(nodeType);
          }
          else
          {
            // TODO add warning here
            inferredTypeNameOfNewFields = 'string'; // for lack of a better guess...
          }
          this.addField(options['newFieldKeyPaths'].get(i), inferredTypeNameOfNewFields);
        }
      }
      if (options['preserveOldFields'] === false)
      {
        for (let i: number = 0; i < fieldNames.size; i++)
        {
          this.disableField(this.getInputFieldID(fieldNames.get(i)));
        }
      }
    }

    this.dag.setNode(this.uidNode.toString(), node);
    this.uidNode++;
    return this.uidNode - 1;
  }

  /**
   * Transform a document according to the current engine configuration.
   *
   * @param {object} doc The document to transform.
   * @returns {object}   The transformed document, or possibly errors.
   */
  public transform(doc: object): object
  {
    let output: object = this.rename(doc);
    this.restoreArrays(output);

    for (const nodeKey of this.dag.sources())
    {
      const toTraverse: string[] = GraphLib.alg.preorder(this.dag, [nodeKey]);
      for (let i = 0; i < toTraverse.length; i++)
      {
        const preprocessedNode: TransformationNode = this.preprocessNode(this.dag.node(toTraverse[i]), output);
        const visitor: TransformationEngineNodeVisitor = new TransformationEngineNodeVisitor();
        const transformationResult: TransformationVisitResult =
          visitor.applyTransformationNode(preprocessedNode, output);
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

    // Exclude disabled fields (must do this as a postprocess, because e.g. join node)
    this.fieldEnabled.map((enabled: boolean, fieldID: number) =>
    {
      if (!enabled)
      {
        yadeep.remove(output, this.getOutputKeyPath(fieldID));
      }
    });

    return output;
  }

  /**
   * Converts the current engine to an equivalent JSON representation.
   *
   * @returns {object} A JSON representation of `this`.
   */
  public toJSON(): object
  {
    // Note: dealing with a lot of Immutable data structures so some
    // slightly verbose syntax is required to convert to plain JS arrays
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

  /**
   * Register a field with the current engine.  This enables adding
   * transformations to the field. If the field already exists, returns
   * the associated id.
   *
   * @param {KeyPath} fullKeyPath The path of the field to add
   * @param {string} typeName     The JS type of the field
   * @param {object} options      Any field options (e.g., Elastic analyzers)
   * @returns {number}            The ID of the newly-added field
   */
  public addField(fullKeyPath: KeyPath, typeName: string = null, options: object = {}): number
  {
    if (this.fieldNameToIDMap.has(fullKeyPath))
    {
      return this.fieldNameToIDMap.get(fullKeyPath);
    }

    this.fieldNameToIDMap = this.fieldNameToIDMap.set(fullKeyPath, this.uidField);
    this.IDToFieldNameMap = this.IDToFieldNameMap.set(this.uidField, fullKeyPath);
    if (typeName === null)
    {
      typeName = 'object';
    }
    this.fieldTypes = this.fieldTypes.set(this.uidField, typeName);
    this.fieldEnabled = this.fieldEnabled.set(this.uidField, true);
    this.fieldProps = this.fieldProps.set(this.uidField, options);

    this.uidField++;
    return this.uidField - 1;
  }

  public deleteField(id: number): void
  {
    // Order matters!  Must do this first, else getTransformations can't work because
    // it relies on the entry in fieldNameToIDMap.
    this.getTransformations(id).forEach((t: number) => this.deleteTransformation(t));

    this.fieldNameToIDMap = this.fieldNameToIDMap.delete(this.fieldNameToIDMap.keyOf(id));
    this.fieldProps = this.fieldProps.delete(id);
    this.fieldEnabled = this.fieldEnabled.delete(id);
    this.IDToFieldNameMap = this.IDToFieldNameMap.delete(id);
    this.fieldTypes = this.fieldTypes.delete(id);
  }

  /**
   * Get the IDs of all transformations that act on a given field.
   *
   * @param {KeyPath | number} field   The field whose associated transformations should be identified
   * @returns {Immutable.List<number>} A list of the associated transformations, sorted properly
   */
  public getTransformations(field: KeyPath | number): List<number>
  {
    // Note: This function is O(n) in number of nodes.  Future work
    // could be adding a map e.g. (field ID => List<transformation ID>)
    // to make this function O(1), if it's ever a performance issue.

    const target: KeyPath = typeof field === 'number' ? this.fieldNameToIDMap.keyOf(field) : field;
    const nodes: TransformationNode[] = [];
    _.each(this.dag.nodes(), (node) =>
    {
      if ((this.dag.node(node) as TransformationNode).fields.includes(target))
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

  /**
   * Returns the actual `TransformationNode` with the specified ID.
   *
   * @param {number} transformationID          ID of the node to retrieve
   * @returns {TransformationNode | undefined} The retrieved node (or undefined if not found)
   */
  public getTransformationInfo(transformationID: number): TransformationNode | undefined
  {
    if (!this.dag.nodes().includes(transformationID.toString()))
    {
      return undefined;
    }
    return this.dag.node(transformationID.toString()) as TransformationNode;
  }

  /**
   * This method allows editing of any/all transformation node properties.
   *
   * @param {number} transformationID Which transformation to update
   * @param {Immutable.List<KeyPath>} fieldNames New field names
   * @param {object} options New options
   */
  public editTransformation(transformationID: number, fieldNames?: List<KeyPath>,
    options?: object): void
  {
    if (!this.dag.nodes().includes(transformationID.toString()))
    {
      return;
    }

    if (fieldNames !== undefined)
    {
      (this.dag.node(transformationID.toString()) as TransformationNode).fields = fieldNames;
    }

    if (options !== undefined)
    {
      (this.dag.node(transformationID.toString()) as TransformationNode).meta = options;
    }
  }

  /**
   * Delete a transformation from the engine/DAG.
   *
   * @param {number} transformationID Which transformation to delete.
   */
  public deleteTransformation(transformationID: number): void
  {
    const inEdges: void | GraphLib.Edge[] = this.dag.inEdges(transformationID.toString());
    const outEdges: void | GraphLib.Edge[] = this.dag.outEdges(transformationID.toString());

    if (typeof inEdges !== 'undefined' && typeof outEdges !== 'undefined')
    {
      if (inEdges.length === 1 && outEdges.length === 1)
      {
        // re-link in node with out node
        this.dag.setEdge(inEdges[0].v, outEdges[0].w);
      } // else not supported yet
    }

    this.dag.removeNode(transformationID.toString());
  }

  /**
   * Rename an input field to the engine (e.g. if the input document schema has changed).
   *
   * @param {number} fieldID     The ID of the field to rename
   * @param {KeyPath} newKeyPath The new path for the field
   * @param source               (Optional) Which source this field is from.
   */
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

  /**
   * Rename an output field to the engine (this is how we rename fields and do
   * promotion/hoisting of nested fields, for instance).
   *
   * @param {number} fieldID     The ID of the field to rename
   * @param {KeyPath} newKeyPath The new path for the field
   * @param dest                 (Optional) Which sink this field is going to.
   * @param prefixMatch          (Optional) Whether or not to attempt to automatically rename child fields
   */
  public setOutputKeyPath(fieldID: number, newKeyPath: KeyPath, dest?: any, prefixMatch: boolean = true): void
  {
    const oldKeyPath: KeyPath = this.IDToFieldNameMap.get(fieldID);

    // Short-circuit: do nothing if this isn't really a change, and also return immediately
    // if this is an invalid rename (because there's already a field named `newKeyPath`)
    if (oldKeyPath === newKeyPath || this.IDToFieldNameMap.valueSeq().contains(newKeyPath))
    {
      return;
    }

    if (prefixMatch === true)
    {
      this.IDToFieldNameMap.forEach((field: KeyPath, id: number) =>
      {
        if (keyPathPrefixMatch(field, oldKeyPath))
        {
          this.IDToFieldNameMap = this.IDToFieldNameMap.set(id,
            updateKeyPath(field, oldKeyPath, newKeyPath, this.fieldTypes.get(id) === 'array'));
        }
      });
    }
    else
    {
      this.IDToFieldNameMap = this.IDToFieldNameMap.set(fieldID, newKeyPath);
    }

    _.each(this.dag.nodes(), (node) =>
    {
      const nfkp: List<KeyPath> | undefined = (this.dag.node(node) as TransformationNode).meta['newFieldKeyPaths'];
      if (nfkp !== undefined)
      {
        for (let i: number = 0; i < nfkp.size; i++)
        {
          if (keyPathPrefixMatch(nfkp.get(i), oldKeyPath))
          {
            this.dag.node(node)['meta']['newFieldKeyPaths'] = nfkp.set(i, updateKeyPath(nfkp.get(i), oldKeyPath, newKeyPath));
          }
        }
      }
    });
  }

  public getInputKeyPath(fieldID: number): KeyPath
  {
    return this.fieldNameToIDMap.keyOf(fieldID);
  }

  public getInputFieldID(path: KeyPath): number
  {
    return this.fieldNameToIDMap.get(path);
  }

  public getOutputKeyPath(fieldID: number): KeyPath
  {
    return this.IDToFieldNameMap.get(fieldID);
  }

  public getOutputFieldID(path: KeyPath): number
  {
    return this.IDToFieldNameMap.keyOf(path);
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

  /**
   * Internal helper method to convert a list of KeyPaths into a list of
   * field IDs (including situations with wildcards in KeyPaths).
   *
   * @param {Immutable.List<KeyPath> | Immutable.List<number>} fieldNamesOrIDs The
   *                                   list of KeyPaths or IDs to parse
   * @returns {Immutable.List<number>} An equivalent list of field IDs
   */
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
          if (name.contains(-1))
          {
            // const upto: KeyPath = name.slice(0, name.indexOf(-1)).toList();
            // ids = ids.push(this.fieldNameToIDMap.get(upto.push(-1)));
            /*if (this.fieldNameToIDMap.has(upto))
            {
              // Add extra fields we might know about from the example doc
              if (this.doc !== undefined && yadeep.get(this.doc, upto) !== undefined)
              {
                for (let i: number = 0; i <= yadeep.get(this.doc, upto).length; i++) {
                  ids = ids.concat(this.parseFieldIDs(List<KeyPath>([name.set(name.indexOf(-1), i.toString())]))).toList();
                }
              }
            }*/
          }
          // else
          // {
          // Fully explicit KeyPath now (no *'s)
          if (this.fieldNameToIDMap.has(name))
          {
            ids = ids.push(this.fieldNameToIDMap.get(name));
          }
          // }
        });
      }
    }

    return ids;
  }

  private addPrimitiveField(ids: List<number>, obj: object, currentKeyPath: KeyPath, key: any): List<number>
  {
    // console.log('x3 ' + currentKeyPath.push(key.toString()));
    return ids.push(this.addField(currentKeyPath.push(key.toString()), typeof obj[key]));
  }

  private addArrayField(ids: List<number>, obj: object, currentKeyPath: KeyPath, key: any, depth: number = 1): List<number>
  {
    // console.log('cpk = ' + currentKeyPath);
    // const arrayKey: any = [key.toString()];
    // const arrayID: number = this.addField(currentKeyPath.push(arrayKey), 'array');
    // console.log('x2 ' + currentKeyPath.push(key.toString()));
    let arrayType;
    try
    {
      arrayType = arrayTypeOfValues(obj[key]);
    }
    catch (e)
    {
      // todo log?
    }
    if (arrayType === undefined)
    {
      arrayType = null;
    }
    const arrayID: number = this.addField(currentKeyPath.push(key.toString()), 'array');
    ids = ids.push(arrayID);
    this.setFieldProp(arrayID, KeyPath(['valueType']), arrayType);
    // console.log('adding awid ' + currentKeyPath.push(key.toString()).push(-1));
    let awkp: KeyPath = currentKeyPath.push(key.toString());
    awkp = awkp.slice(0, awkp.size - depth + 1).toList();
    for (let i: number = 0; i < depth; i++)
    {
      awkp = awkp.push(-1);
    }
    // console.log('x4 ' + awkp);
    const arrayWildcardID: number = this.addField(awkp, 'array');
    this.setFieldProp(arrayWildcardID, KeyPath(['valueType']), arrayType);
    ids = ids.push(arrayWildcardID);
    // this.setFieldProp(arrayID, KeyPath(['arrayLength']), obj[key].length);
    for (let i: number = 0; i < obj[key].length; i++)
    {
      // const arrayKey_i: any = arrayKey.push(i.toString());
      if (isPrimitive(obj[key][i]))
      {
        ids = this.addPrimitiveField(ids, obj[key], currentKeyPath.push(key.toString()), i);
        // ids = ids.push(this.addField(currentKeyPath.push(arrayKey_i), typeof obj[key]));
      } else if (Array.isArray(obj[key][i]))
      {
        // console.log('cpk2 ' + currentKeyPath.push(key.toString()) + ' ' + JSON.stringify(obj[key][i]));
        ids = this.addArrayField(ids, obj[key], currentKeyPath.push(key.toString()), i, depth + 1);
      } else
      {
        // console.log('x1 ' + currentKeyPath.push(key.toString()).push(i.toString()));
        ids = ids.push(this.addField(currentKeyPath.push(key.toString()).push(i.toString()), typeof obj[key][i]));
        // console.log('foo ' + currentKeyPath.push(key.toString()).push(i.toString()));
        ids = this.addObjectField(ids, obj[key][i], awkp, true);
        ids = this.addObjectField(ids, obj[key][i], currentKeyPath.push(key.toString()).push(i.toString()), true);
      }
    }
    return ids;
  }

  private addObjectField(ids: List<number>, obj: object, currentKeyPath: KeyPath, prevArray: boolean = false): List<number>
  {
    for (const key of Object.keys(obj))
    {
      if (isPrimitive(obj[key]))
      {
        if (prevArray && !this.fieldNameToIDMap.has(currentKeyPath.butLast().toList().push(-1).push(key)))
        {
          ids = this.addPrimitiveField(ids, obj, currentKeyPath.butLast().toList().push(-1), key);
        }
        ids = this.addPrimitiveField(ids, obj, currentKeyPath, key);
      } else if (obj[key].constructor === Array)
      {
        if (prevArray && !this.fieldNameToIDMap.has(currentKeyPath.butLast().toList().push(-1).push(key)))
        {
          ids = this.addArrayField(ids, obj, currentKeyPath.butLast().toList().push(-1), key);
        }
        ids = this.addArrayField(ids, obj, currentKeyPath, key);
      } else
      {
        if (prevArray && !this.fieldNameToIDMap.has(currentKeyPath.butLast().toList().push(-1).push(key)))
        {
          // current children
          ids = ids.push(this.addField(currentKeyPath.butLast().toList().push(-1).push(key), typeof obj[key]));
          // recursive call with wildcard
          ids = this.addObjectField(ids, obj[key], currentKeyPath.butLast().toList().push(-1).push(key));
        }
        ids = ids.push(this.addField(currentKeyPath.push(key), typeof obj[key]));
        // recursive call without wildcard
        ids = this.addObjectField(ids, obj[key], currentKeyPath.push(key));
      }
    }
    return ids;
  }

  /**
   * Private helper that parses an example document and registers all its fields,
   * using the above helper functions.  Recursive.
   *
   * @param {object} obj               The document to parse
   * @param {KeyPath} currentKeyPath   Recursive parameter; what path you've built up so far
   * @returns {Immutable.List<number>} A list of field IDs added
   */
  private generateInitialFieldMaps(obj: object, currentKeyPath: KeyPath = List<string>()): List<number>
  {
    let ids: List<number> = List<number>();
    ids = this.addObjectField(ids, obj, currentKeyPath);
    return ids;
  }

  private preprocessNode(rawNode: TransformationNode, ftDoc: object): TransformationNode
  {
    const node: TransformationNode = _.cloneDeep(rawNode);
    node.fields = node.fields.clear();
    rawNode.fields.forEach((item) =>
    {
      node.fields = node.fields.push(this.IDToFieldNameMap.get(this.fieldNameToIDMap.get(item)));
    });
    return node;
  }

  private rename(doc: object): object
  {
    const r: object = {};
    const o: object = doc; // objectify(doc);
    // sort the field map so that parent renames don't cause weird issues with children renames
    const fieldToIDMap = this.fieldNameToIDMap.sort((valueA, valueB) =>
    {
      const sizeA = this.getOutputKeyPath(valueA).size;
      const sizeB = this.getOutputKeyPath(valueB).size;
      if (sizeA === sizeB)
      {
        return valueA - valueB;
      }
      return sizeA - sizeB;
    });
    fieldToIDMap.forEach((value: number, key: KeyPath) =>
    {
      this.renameHelper(r, o, key, value);
    });
    return r;
  }

  private renameHelper(r: object, o: object, key: KeyPath, value?: number, oldKey?: KeyPath)
  {
    // console.log('rh key = ' + key + ' val = ' + value);
    if (value === undefined)
    {
      // console.log(JSON.stringify(o));
      // console.log(oldKey);
      // console.log(yadeep.get(o, oldKey));

      // setting new array element
      yadeep.set(r, key, yadeep.get(o, oldKey), { create: true });
    }
    else // if (this.fieldEnabled.has(value) === false || this.fieldEnabled.get(value) === true)
    {
      const el: any = yadeep.get(o, key);
      // console.log('el = ' + el + ' for key ' + key);
      if (el !== undefined)
      {
        if (isPrimitive(el) || Object.keys(el).length === 0)
        {
          yadeep.set(r, this.IDToFieldNameMap.get(value), el, { create: true });
        }
        else if (el.constructor === Array)
        {
          if (key.contains(-1))
          {
            const newKey: KeyPath = this.IDToFieldNameMap.get(value);
            const upto: KeyPath = key.slice(0, key.indexOf(-1)).toList();
            for (let j: number = 0; j < Object.keys(yadeep.get(o, upto)).length; j++)
            {
              const newKeyReplaced: KeyPath = newKey.set(newKey.indexOf(-1), j.toString());
              const oldKeyReplaced: KeyPath = key.set(key.indexOf(-1), j.toString());
              const oldKeyReplacedWithoutLast = oldKeyReplaced.slice(0, -1).toList();
              if (oldKeyReplaced.last() === -1 ||
                (yadeep.get(o, oldKeyReplacedWithoutLast) != null &&
                  Object.keys(yadeep.get(o, oldKeyReplacedWithoutLast)).indexOf(oldKeyReplaced.last().toString()) !== -1))
              {
                // console.log('r here1');
                this.renameHelper(r, o, newKeyReplaced, this.fieldNameToIDMap.get(newKeyReplaced), oldKeyReplaced);
              }
            }
          }
          /*else
          {
            for (let i: number = 0; i < Object.keys(el).length; i++)
            {
              const kpi: KeyPath = key.push(i.toString());
              console.log('r here2 ' + kpi);
              this.renameHelper(r, o, kpi);
            }
          }*/
        }
      }
    }
  }

  private restoreArrays(output: object)
  {
    // If a field is supposed to be an array but is an object in its flattened
    // representation, convert it back to an array
    this.IDToFieldNameMap.map((value: KeyPath, key: number) =>
    {
      // Need to do this regardless of whether the field is enabled, e.g. in case we're
      // duplicating a disabled array
      if (yadeep.get(output, value) !== undefined)
      {
        if (this.fieldTypes.get(key) === 'array' && !value.includes(-1))
        {
          const x = yadeep.get(output, value);
          if (x === null)
          {
            yadeep.set(output, value, [], { create: true });
          }
          else
          {
            x['length'] = Object.keys(x).length;
            yadeep.set(output, value, Array.prototype.slice.call(x), { create: true });
          }
        }
      }
    });
  }
}
