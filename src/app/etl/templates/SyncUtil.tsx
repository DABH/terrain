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
// tslint:disable:max-classes-per-file import-spacing

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';

import
{
  _TemplateField, _TransformationNode,
  TemplateField, TransformationNode,
} from 'etl/templates/FieldTypes';
import { FieldMap } from 'etl/templates/TemplateEditorTypes';
import { _ETLTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import * as Utils from 'shared/etl/util/ETLUtils';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';

const hiddenPath = List(['uiState', 'hidden']);
export function createFieldMap(engine: TransformationEngine): FieldMap
{
  const treeMap = engine.createTree()
    .map((children, id) => createFieldFromEngine(engine, id).set('childrenIds', children))
    .toMap();
  return treeMap;
}

// takes a field id and and engine and constructs a TemplateField object (does not construct children)
export function createFieldFromEngine(
  engine: TransformationEngine,
  id: number,
): TemplateField
{
  const enginePath = engine.getFieldPath(id);
  const transformationIds = engine.getTransformations(id);

  const transformations: List<TransformationNode> = transformationIds.map((transformationId, index) =>
  {
    const transformNode = engine.getTransformationInfo(transformationId);
    return _TransformationNode({
      id: transformNode.id,
      typeCode: transformNode.typeCode,
      fields: transformNode.fields,
      meta: transformNode.meta,
    });
  }).toList();

  return _TemplateField({
    isIncluded: engine.getFieldEnabled(id),
    isHidden: engine.getFieldProp(id, hiddenPath) === true,
    fieldId: id,
    fieldProps: engine.getFieldProps(id),
    outputKeyPath: engine.getFieldPath(id),
    etlType: Utils.engine.fieldType(id, engine),
    transformations,
    name: enginePath.last().toString(),
  });
}

export function updateFieldFromEngine(
  engine: TransformationEngine,
  id: number,
  oldField: TemplateField,
): TemplateField
{
  const updatedField = createFieldFromEngine(engine, id);
  return updatedField.set('childrenIds', oldField.childrenIds);
}
