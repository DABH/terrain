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

// tslint:disable:no-var-requires
import TerrainComponent from 'common/components/TerrainComponent';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import { instanceFnDecorator } from 'shared/util/Classes';
import { Colors, fontColor } from 'src/app/colors/Colors';
import Quarantine from 'util/RadiumQuarantine';
import Util from 'util/Util';

import { List } from 'immutable';

import EditorFieldNode from 'etl/templates/components/field/EditorFieldNode';
import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { FieldMap, TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import UnrecognizedField from './UnrecognizedField';

import './TemplateEditorField.less';

interface Props
{
  preview: object;
  noInteract: boolean;
  // injected props
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

class RootFieldNode extends TerrainComponent<Props>
{
  public state: {
    expandableViewOpen: boolean;
  } = {
      expandableViewOpen: false,
    };

  @instanceFnDecorator(memoizeOne)
  public computeRootFields(
    fieldMap: FieldMap,
    engine: TransformationEngine,
    engineVersion: number,
    comparator: (a, b) => number,
  ): List<TemplateField>
  {
    if (engine == null || fieldMap == null)
    {
      return List([]);
    }

    const rootFields = fieldMap.filter((field, id) =>
    {
      const outputKP = engine.getFieldPath(id);
      return outputKP !== undefined && outputKP.size === 1;
    });

    return rootFields.sortBy(
      (field, id) => id,
      comparator,
    ).toList();
  }

  public renderChildFields()
  {
    const { templateEditor, preview, noInteract } = this.props;
    const engine = templateEditor.getCurrentEngine();
    const engineVersion = templateEditor.uiState.engineVersion;

    const rootFields = this.computeRootFields(
      templateEditor.fieldMap,
      engine,
      engineVersion,
      templateEditor.getCurrentComparator(),
    );
    const unvisited = new Set(preview != null ? Object.keys(preview) : []);
    const rootComponents = rootFields.map((childField, index) =>
    {
      const childPreview = preview != null ? preview[childField.name] : null;
      if (unvisited.has(childField.name))
      {
        unvisited.delete(childField.name);
      }
      return (
        <EditorFieldNode
          fieldId={childField.fieldId}
          noInteract={noInteract}
          canEdit={true}
          preview={childPreview}
          displayKeyPath={emptyList}
          key={`${templateEditor.getCurrentEdgeId()}-${childField.fieldId}`}
        />
      );
    }).toList();

    const unrecognized = List(unvisited.values()).map((key) => {
      return (
        <UnrecognizedField
          key={key}
          path={this._ikeyPath(emptyList, key)}
          isRoot={true}
          preview={preview[key]}
        />
      );
    });
    return rootComponents.concat(unrecognized);
  }

  public render()
  {
    return (
      <div className='template-editor-children-container'>
        {this.renderChildFields()}
        <Quarantine>
          <div
            className='add-another-field-button'
            style={fontColor(Colors().text3, Colors().text2)}
            onClick={this.handleAddAnotherFieldClicked}
          >
            Add Another Field
          </div>
        </Quarantine>
      </div>
    );
  }

  public handleAddAnotherFieldClicked()
  {
    this.props.act({
      actionType: 'setDisplayState',
      state: {
        addFieldId: -1,
      },
    });
  }
}

const emptyList = List([]);

export default Util.createTypedContainer(
  RootFieldNode,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
