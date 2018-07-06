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
// tslint:disable:no-var-requires import-spacing

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import Util from 'util/Util';

import * as Immutable from 'immutable';
import memoizeOne from 'memoize-one';
const { List, Map } = Immutable;
import { instanceFnDecorator } from 'shared/util/Classes';

import { compareObjects, isVisiblyEqual, PropertyTracker, UpdateChecker } from 'etl/ETLUtil';
import GraphHelpers from 'etl/helpers/GraphHelpers';
import { EngineProxy, FieldProxy } from 'etl/templates/EngineProxy';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { EditorDisplayState, FieldMap, TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { FieldVerification } from 'shared/etl/languages/LanguageControllers';
import { SinkConfig, SinkOptionsType, Sinks, SourceConfig, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { Languages, NodeTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

/*
 *  This class defines a base class with useful functions that are used by components
 *  that handle UI for template editor fields.
 */
export interface TemplateEditorFieldProps
{
  fieldId: number;
  canEdit: boolean;
  noInteract: boolean; // determines if the template editor is not interactable (e.g. the side preview)
  preview: any;
  displayKeyPath: KeyPath; // for array fields

  // injected props:
  act?: typeof TemplateEditorActions;
}

export const mapDispatchKeys = {
  act: TemplateEditorActions,
};
export const mapStateKeys = [
  ['templateEditor'],
];

interface Injected
{
  templateEditor: TemplateEditorState;
}

export abstract class TemplateEditorField<Props extends TemplateEditorFieldProps> extends TerrainComponent<Props>
{
  private uiStateTracker: PropertyTracker<EditorDisplayState> = new PropertyTracker(this.getUIStateValue.bind(this));
  private updateChecker: UpdateChecker = new UpdateChecker();

  constructor(props)
  {
    super(props);
  }

  public componentWillUpdate(nextProps, nextState)
  {
    // if you override this function, please call this
    this.uiStateTracker.reset();
    this.updateChecker.reset();
  }

  public shouldComponentUpdate(nextProps, nextState)
  {
    // check if this field no longer exists
    const currentEngine = getCurrentEngine(nextProps);
    if (currentEngine == null || currentEngine.getFieldPath(nextProps.fieldId) === undefined)
    {
      return false;
    }

    // check state
    if (!compareObjects(this.state, nextState))
    {
      return true;
    }
    // check custom update checks
    if (!this.updateChecker.runChecks(this.props, nextProps, this.state, nextState))
    {
      return true;
    }
    // check props
    const uiStateKeysSeen = this.uiStateTracker.getSeen();
    const customComparatorMap = {
      templateEditor: (current, next) =>
      {
        const subComparatorMap = {
          uiState: (value, nextValue) =>
          {
            return isVisiblyEqual(value, nextValue, uiStateKeysSeen);
          },
        };
        return compareObjects(current.toObject(), next.toObject(), subComparatorMap);
      },
    };
    return !compareObjects(this.props, nextProps, customComparatorMap);
  }

  protected _template(props = this.props): ETLTemplate
  {
    return (props as Props & Injected).templateEditor.template;
  }

  protected _fieldMap(props = this.props): FieldMap
  {
    return (props as Props & Injected).templateEditor.fieldMap;
  }

  protected _field(id = this.props.fieldId, props = this.props): TemplateField
  {
    return this._fieldMap(props).get(id);
  }

  protected _uiState(): PropertyTracker<EditorDisplayState>
  {
    return this.uiStateTracker;
  }

  protected _currentEngine(props = this.props): TransformationEngine
  {
    this.updateChecker.setChecker('currentEngine', getCurrentEngine);
    return getCurrentEngine(props);
  }

  protected _currentComparator(): (a, b) => number
  {
    this.updateChecker.setChecker('currentComparator', getCurrentComparator);
    return getCurrentComparator(this.props);
  }

  protected _getArrayIndex(): number
  {
    const last = Number(this.props.displayKeyPath.last());
    return Number.isNaN(last) ? -1 : last;
  }

  // for array types
  @instanceFnDecorator(memoizeOne)
  protected _getPreviewChildPath(index, cacheKey = this.props.preview): KeyPath
  {
    return this.getDKPCachedFn(this.props.displayKeyPath, cacheKey)(index);
  }

  // todo should this return a promise to be consistent with ETLHelpers?
  protected _try(tryFn: (proxy: FieldProxy) => void)
  {
    GraphHelpers.mutateEngine((engineProxy: EngineProxy) =>
    {
      tryFn(engineProxy.makeFieldProxy(this.props.fieldId));
    }).then((isStructural: boolean) =>
    {
      if (isStructural)
      {
        this.props.act({
          actionType: 'rebuildFieldMap',
        });
      }
      else
      {
        this.props.act({
          actionType: 'rebuildField',
          fieldId: this.props.fieldId,
        });
      }
    }).catch(this._showError('Could not perform action'));
  }

  protected _showError(subject: string)
  {
    return (err) =>
    {
      this.props.act({
        actionType: 'addModal',
        props: {
          title: 'Error',
          message: `${subject}: ${String(err)}`,
          error: true,
        },
      });
      // tslint:disable-next-line
      console.error(err);
    };
  }

  protected _passProps(config: object = {}): TemplateEditorFieldProps
  {
    return _.extend(_.pick(this.props, ['fieldId', 'canEdit', 'noInteract', 'preview', 'displayKeyPath']), config);
  }

  protected _isRootField()
  {
    const { fieldId } = this.props;
    const kp = this._field().outputKeyPath;
    return kp.size === 1;
  }

  protected _fieldDepth(props = this.props)
  {
    return this._field(props.fieldId, props).outputKeyPath.size;
  }

  protected _getCurrentLanguage(props = this.props): Languages
  {
    this.updateChecker.setChecker('currentLanguage', getCurrentLanguage);
    return getCurrentLanguage(props);
  }

  protected _settingsAreOpen(props = this.props): boolean
  {
    this.updateChecker.setChecker('settingsOpen', settingsAreOpen);
    return settingsAreOpen(props);
  }

  protected _engineVersion(props = this.props): number
  {
    this.updateChecker.setChecker('engineVersion', getEngineVersion);
    return getEngineVersion(props);
  }

  protected _getFieldVerifications(props = this.props): List<FieldVerification>
  {
    this.updateChecker.setChecker('fieldVerifications', getVerifications);
    return getVerifications(props);
  }

  protected _willFieldChange(nextProps)
  {
    return this._field(this.props.fieldId, this.props)
      !== this._field(nextProps.fieldId, nextProps);
  }

  @instanceFnDecorator(memoizeOne)
  private getDKPCachedFn(displayKeyPath, cacheDependency)
  {
    return _.memoize((index) =>
    {
      return displayKeyPath.push(index);
    });
  }

  // ignores property tracker
  private getUIStateValue(): EditorDisplayState
  {
    return (this.props as Props & Injected).templateEditor.uiState;
  }
}

function getEngineVersion(props: TemplateEditorFieldProps): number
{
  return (props as TemplateEditorFieldProps & Injected).templateEditor.uiState.engineVersion;
}

function getCurrentComparator(props: TemplateEditorFieldProps): (a, b) => number
{
  return (props as TemplateEditorFieldProps & Injected).templateEditor.getCurrentComparator();
}

function getCurrentEngine(props: TemplateEditorFieldProps): TransformationEngine
{
  return (props as TemplateEditorFieldProps & Injected).templateEditor.getCurrentEngine();
}

function getCurrentLanguage(props: TemplateEditorFieldProps)
{
  const templateEditor = (props as TemplateEditorFieldProps & Injected).templateEditor;
  return templateEditor.template.getEdgeLanguage(templateEditor.getCurrentEdgeId());
}

function getVerifications(props: TemplateEditorFieldProps)
{
  const templateEditor = (props as TemplateEditorFieldProps & Injected).templateEditor;
  return templateEditor.uiState.fieldVerifications.get(props.fieldId);
}

function settingsAreOpen(props: TemplateEditorFieldProps)
{
  const { displayKeyPath, noInteract, fieldId } = props;
  if (noInteract)
  {
    return false;
  }
  else
  {
    const { settingsState } = (props as TemplateEditorFieldProps & Injected).templateEditor.uiState;
    return fieldId === settingsState.fieldId &&
      displayKeyPath.equals(settingsState.dkp);
  }
}
