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
import { EngineProxy, FieldProxy } from 'etl/templates/EngineProxy';
import { TransformationNode } from 'etl/templates/FieldTypes';
import { ETLFieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';

import { DynamicForm } from 'common/components/DynamicForm';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

export interface TransformationFormProps
{
  isCreate: boolean; // whether or not the transformation is being created or edited
  transformation?: TransformationNode; // must be supplied if isCreate is false
  engine: TransformationEngine;
  fieldId: number;
  onClose: () => void;
  tryMutateEngine: (tryFn: (proxy: EngineProxy) => void) => void;
  registerApply?: (apply: () => void) => void;
}
type TFProps = TransformationFormProps; // short alias

export interface TransformationArgs<Type extends TransformationNodeType>
{
  options: NodeOptionsType<Type>;
  fields: List<EnginePath>;
}

export abstract class TransformationForm<State, Type extends TransformationNodeType>
  extends TerrainComponent<TFProps>
{
  public state: State;
  // override these to configure
  protected readonly abstract inputMap: InputDeclarationMap<State>;
  protected readonly abstract initialState: State;
  protected readonly abstract type: Type;
  protected readonly noEditOptions: boolean = false;

  constructor(props)
  {
    super(props);
    this.handleMainAction = this.handleMainAction.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
  }

  public componentDidMount()
  {
    if (this.props.registerApply !== undefined && !this.props.isCreate)
    {
      this.props.registerApply(() => this.handleMainAction());
    }
  }

  public componentWillMount()
  {
    try
    {
      this.setState(this.computeInitialState());
    }
    catch (e)
    {
      // todo catch error?
      this.setState(this.initialState);
    }
  }

  public render()
  {
    const { isCreate } = this.props;
    if (!isCreate && this.noEditOptions)
    {
      return (
        <div
          style={{
            display: 'flex',
            padding: '12px',
            justifyContent: 'center',
          }}
        >
          This Transformation Is Not Editable
        </div>
      );
    }

    const mainButton = (this.props.registerApply === undefined || this.props.isCreate) ? {
      name: isCreate ? 'Create' : 'Save',
      onClicked: this.handleMainAction,
    } : undefined;

    const secondButton = (this.props.registerApply === undefined || this.props.isCreate) ? {
      name: 'Cancel',
      onClicked: this.props.onClose,
    } : undefined;

    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.state}
        onStateChange={this.handleFormChange}
        style={{
          flexGrow: '1',
        }}
        mainButton={mainButton}
        secondButton={secondButton}
        actionBarStyle={{
          justifyContent: 'center',
        }}
      />
    );
  }

  // override this to specify transformation args if they need to be computed from state
  protected computeArgs(): TransformationArgs<Type>
  {
    const { transformation, isCreate, engine, fieldId } = this.props;
    const fields = isCreate ?
      List([engine.getInputKeyPath(fieldId)]) :
      transformation.fields;

    return {
      options: this.state,
      fields,
    };
  }

  // override this to customize the newFieldInfo object that gets passed to addTransformation
  protected overrideTransformationConfig(): { type?: ETLFieldTypes, valueType?: ETLFieldTypes, newSourceType?: ETLFieldTypes }
  {
    return undefined;
  }

  // override this to customize how initial state gets computed from existing args
  protected computeInitialState(): State
  {
    const { isCreate, transformation } = this.props;
    if (isCreate)
    {
      return this.initialState;
    }
    else
    {
      return transformation.meta as NodeOptionsType<Type>;
    }
  }

  // override this to customize how transformations are created
  protected createTransformation(proxy: EngineProxy)
  {
    const args = this.computeArgs();
    proxy.addTransformation(this.type, args.fields, args.options, this.overrideTransformationConfig());
  }

  // override this to customize how transformations are edited
  protected editTransformation(proxy: EngineProxy)
  {
    const { transformation } = this.props;
    const args = this.computeArgs();
    proxy.editTransformation(transformation.id, args.fields, args.options, this.overrideTransformationConfig());
  }

  // override this to customize how the state object changes when a form element changes
  protected transformFormOnChange(state: State): State
  {
    return state;
  }

  // the below shouldn't need to be overidden
  protected handleFormChange(state: State)
  {
    this.setState(this.transformFormOnChange(state));
  }

  protected handleMainAction()
  {
    const { isCreate, engine, fieldId, onClose } = this.props;
    if (isCreate)
    {
      this.props.tryMutateEngine((proxy) =>
      {
        this.createTransformation(proxy);
      });
      onClose();
    }
    else
    {
      this.props.tryMutateEngine((proxy) =>
      {
        this.editTransformation(proxy);
      });
      onClose();
    }
  }
}
