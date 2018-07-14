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
// tslint:disable:no-var-requires no-empty-interface max-classes-per-file
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';

import { instanceFnDecorator } from 'shared/util/Classes';

import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { TransformationNode } from 'etl/templates/FieldTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { TransformationArgs, TransformationForm, TransformationFormProps } from './TransformationFormBase';

import { DynamicForm } from 'common/components/DynamicForm';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

interface SplitOptions
{
  leftName: string;
  rightName: string;
  delimiter: string | number;
  regex: boolean;
}

// curent assumption is that you only split into 2 fields.
// TODO extend class so it can take arbitrary # of splits
export class SplitTFF extends TransformationForm<SplitOptions, TransformationNodeType.SplitNode>
{
  protected readonly inputMap: InputDeclarationMap<SplitOptions> = {
    leftName: {
      type: DisplayType.TextBox,
      displayName: 'New Field Name 1',
      group: 'new name',
      widthFactor: 3,
    },
    rightName: {
      type: DisplayType.TextBox,
      displayName: 'New Field Name 2',
      group: 'new name',
      widthFactor: 3,
    },
    delimiter: {
      type: DisplayType.TextBox,
      displayName: 'Delimiter',
      group: 'row2',
      widthFactor: 3,
    },
    regex: {
      type: DisplayType.CheckBox,
      displayName: 'Treat Delimiter as Regex?',
      group: 'row2',
      widthFactor: -1,
    },
  };
  protected readonly initialState = {
    leftName: 'Split Field 1',
    rightName: 'Split Field 2',
    delimiter: '-',
    regex: false,
  };
  protected readonly type = TransformationNodeType.SplitNode; // lack of type safety here

  protected computeInitialState()
  {
    const { isCreate, transformation } = this.props;
    if (isCreate)
    {
      return this.initialState;
    }
    else
    {
      const meta = transformation.meta as NodeOptionsType<TransformationNodeType.SplitNode>;
      return {
        leftName: meta.newFieldKeyPaths.size > 0 ? meta.newFieldKeyPaths.get(0).last().toString() : '',
        rightName: meta.newFieldKeyPaths.size > 1 ? meta.newFieldKeyPaths.get(1).last().toString() : '',
        delimiter: meta.delimiter,
        regex: meta.regex,
      };
    }
  }

  protected computeArgs()
  {
    const { engine, fieldId } = this.props;
    const { leftName, rightName, delimiter, regex } = this.state;
    const args = super.computeArgs();

    const currentKeyPath = engine.getFieldPath(fieldId);
    const changeIndex = currentKeyPath.size - 1;

    const newFieldKeyPaths = List([
      currentKeyPath.set(changeIndex, leftName),
      currentKeyPath.set(changeIndex, rightName),
    ]);

    return {
      options: {
        newFieldKeyPaths,
        delimiter,
        regex,
      },
      fields: args.fields,
    };
  }
}
