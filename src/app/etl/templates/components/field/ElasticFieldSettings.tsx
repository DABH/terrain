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

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { instanceFnDecorator } from 'shared/util/Classes';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { compareObjects } from 'etl/ETLUtil';

import
{
  _TemplateField,
  TemplateField,
} from 'etl/templates/FieldTypes';
import { defaultProps, ElasticAnalyzers, ElasticFieldProps, ElasticTypes, ETLToElasticOptions } from 'shared/etl/types/ETLElasticTypes';
import { ETLFieldTypes, FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './FieldSettings.less';

export interface Props extends TemplateEditorFieldProps
{
  registerApply: (apply: () => void) => void;
}

class ElasticFieldSettings extends TemplateEditorField<Props>
{
  public state: ElasticFieldProps;

  private inputMap: InputDeclarationMap<ElasticFieldProps> = {
    isPrimaryKey: {
      type: DisplayType.CheckBox,
      displayName: 'Primary Key',
      group: 'first row',
      widthFactor: 3,
      getDisplayState: this.showPrimaryKey,
    },
    elasticType: {
      type: DisplayType.Pick,
      displayName: 'Elastic Type',
      group: 'first row',
      widthFactor: 3,
      options: {
        pickOptions: this.getTypeOptions,
        indexResolver: this.resolveTypeIndex,
      },
    },
    isAnalyzed: {
      type: DisplayType.CheckBox,
      displayName: 'Analyze This Field',
      group: 'analyzer row',
      widthFactor: 3,
      getDisplayState: this.showIsAnalyzed,
    },
    analyzer: {
      type: DisplayType.Pick,
      displayName: 'Analyzer',
      group: 'analyzer row',
      widthFactor: 3,
      options: {
        pickOptions: this.getAnalyzerOptions,
        indexResolver: this.resolveAnalyzerIndex,
      },
      getDisplayState: this.showAnalyzer,
    },
  };

  constructor(props)
  {
    super(props);
    this.state = this.getFormState(props);
  }

  public showPrimaryKey(s: ElasticFieldProps)
  {
    const jsType = this._field().representedType();
    return ((jsType === 'string' || jsType === 'number') && this._isRootField()) ?
      DisplayState.Active : DisplayState.Inactive;
  }

  public showIsAnalyzed(s: ElasticFieldProps)
  {
    const jsType = this._field().representedType();
    return (jsType === 'string' && !s.isPrimaryKey) ?
      DisplayState.Active : DisplayState.Inactive;
  }

  public showAnalyzer(s: ElasticFieldProps)
  {
    return (this.showIsAnalyzed(s) === DisplayState.Active && s.isAnalyzed) ?
      DisplayState.Active : DisplayState.Inactive;
  }

  @instanceFnDecorator(memoizeOne)
  public _getTypeOptions(etlType: ETLFieldTypes): List<string>
  {
    return List(ETLToElasticOptions[etlType]);
  }

  public getTypeOptions()
  {
    return this._getTypeOptions(this._field().etlType);
  }

  public resolveTypeIndex(option)
  {
    return ETLToElasticOptions[this._field().etlType].indexOf(option);
  }

  @instanceFnDecorator(memoizeOne)
  public getAnalyzerOptions()
  {
    return List(Object.keys(ElasticAnalyzers));
  }

  public resolveAnalyzerIndex(option)
  {
    return ElasticAnalyzers[option];
  }

  public componentDidMount()
  {
    this.props.registerApply(() => this.handleSettingsApplied());
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this._willFieldChange(nextProps))
    {
      this.setState({
        formState: this.getFormState(nextProps),
      });
    }
  }

  public getFormState(props): ElasticFieldProps
  {
    const field = this._fieldMap(props).get(props.fieldId);
    const { fieldProps } = field;
    const elasticFieldProps = fieldProps[Languages.Elastic] as Partial<ElasticFieldProps>;
    return defaultProps(elasticFieldProps);
  }

  public render()
  {
    return (
      <div className='field-advanced-settings'>
        <DynamicForm
          inputMap={this.inputMap}
          inputState={this.state}
          onStateChange={this.handleStateChange}
          style={{
            flexGrow: 1,
            padding: '12px',
            justifyContent: 'center',
          }}
          actionBarStyle={{
            justifyContent: 'center',
          }}
        />
      </div>
    );
  }

  public handleSettingsApplied()
  {
    if (!compareObjects(this.state, this.getFormState(this.props)))
    {
      this._try((proxy) =>
      {
        proxy.setFieldProps(this.state, Languages.Elastic);
      });
    }
  }

  public handleStateChange(state)
  {
    this.setState(state);
  }
}

export default Util.createTypedContainer(
  ElasticFieldSettings,
  mapStateKeys,
  mapDispatchKeys,
);
