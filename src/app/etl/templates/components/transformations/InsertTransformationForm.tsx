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

import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { TransformationForm } from './TransformationFormBase';

import { List } from 'immutable';

interface InsertOptions
{
  insertType: TypeOptions;
  customIndex: number;
  value: string;
}

type TypeOptions = 'append' | 'prepend' | 'custom';
const typeOptions: List<TypeOptions> = List(['append', 'prepend', 'custom'] as TypeOptions[]);

export class InsertTFF extends TransformationForm<InsertOptions, TransformationNodeType.InsertNode>
{
  protected readonly inputMap: InputDeclarationMap<InsertOptions> = {
    insertType: {
      type: DisplayType.Pick,
      displayName: 'Type',
      group: 'first',
      widthFactor: 2,
      options: {
        pickOptions: (s) => typeOptions,
        indexResolver: (option) => typeOptions.indexOf(option),
      },
    },
    customIndex: {
      type: DisplayType.NumberBox,
      displayName: 'Position',
      group: 'first',
      widthFactor: 2,
      getDisplayState: (s: InsertOptions) => s.insertType === 'custom' ? DisplayState.Active : DisplayState.Hidden,
    },
    value: {
      type: DisplayType.TextBox,
      displayName: 'Value to Add',
      group: 'second',
      widthFactor: 4,
    },
  };
  protected readonly initialState = {
    insertType: 'append' as 'append',
    customIndex: 0,
    value: '',
  };
  protected readonly type = TransformationNodeType.InsertNode;

  protected computeInitialState()
  {
    const { isCreate, transformation } = this.props;
    if (isCreate)
    {
      return this.initialState;
    }
    else
    {
      const meta = transformation.meta as NodeOptionsType<TransformationNodeType.InsertNode>;
      let type: TypeOptions = 'custom';
      if (meta.at === 0)
      {
        type = 'prepend';
      }
      else if (meta.at === -1)
      {
        type = 'append';
      }
      return {
        insertType: type,
        customIndex: meta.at,
        value: meta.value as string,
      };
    }
  }

  protected computeArgs()
  {
    const { engine, fieldId } = this.props;
    const { value, insertType, customIndex } = this.state;
    const args = super.computeArgs();

    let index = customIndex;
    if (insertType === 'append')
    {
      index = -1;
    }
    else if (insertType === 'prepend')
    {
      index = 0;
    }

    return {
      options: {
        value,
        at: index,
      },
      fields: args.fields,
    };
  }
}
