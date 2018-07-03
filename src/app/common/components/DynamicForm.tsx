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
// tslint:disable:no-var-requires strict-boolean-expressions

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import * as TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import { instanceFnDecorator } from 'shared/util/Classes';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { DisplayState, DisplayType, InputDeclarationMap, InputDeclarationType, OptionType } from './DynamicFormTypes';

const Color = require('color');
import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import Autocomplete from 'common/components/Autocomplete';
import CheckBox from 'common/components/CheckBox';
import Dropdown from 'common/components/Dropdown';
import FadeInOut from 'common/components/FadeInOut';
import ListForm from 'common/components/ListForm';
import Switch from 'common/components/Switch';

import './DynamicForm.less';

export interface ButtonOptions
{
  name: string;
  onClicked: () => void;
  disabled?: boolean; // if true, button is unclickable.
  isActive?: boolean; // if true, button has active styling. If undefined, takes default.
}
// Other types
export interface Props<FState>
{
  inputMap: InputDeclarationMap<FState>; // inputMap is memoized, so be careful about changing its properties on the fly!
  inputState: FState;
  onStateChange: (newState: FState, blur?: boolean) => void;
  mainButton?: ButtonOptions; // active styling by default
  secondButton?: ButtonOptions; // buttons are rendered from right to left
  thirdButton?: ButtonOptions;
  style?: any; // gets applied to root container
  actionBarStyle?: any; // gets applied to the bottom container style
  children?: any; // children get rendered between the buttons and the form components
  centerForm?: boolean; // if true, the form content gets centered in the container
  validate?: (state: FState) => string | undefined; // return a string if there's an error
  onTextInputEnter?: () => void;
}
// if we want to allow immutable state objects, add an optional state mutator to each input declaration type

@Radium
export class DynamicForm<S> extends TerrainComponent<Props<S>>
{
  public renderFnLookup:
    { [K in DisplayType]: renderSignature<S> } =
    {
      [DisplayType.CheckBox]: this.renderCheckBox,
      [DisplayType.NumberBox]: this.renderNumberBox,
      [DisplayType.TextBox]: this.renderTextBox,
      [DisplayType.Pick]: this.renderPick,
      [DisplayType.TagsBox]: this.renderTagsBox,
      [DisplayType.Custom]: this.renderCustom,
      [DisplayType.Delegate]: this.renderDelegate,
      [DisplayType.Switch]: this.renderSwitch,
    };

  public yOffsetLookup:
    { [K in DisplayType]: number } =
    {
      [DisplayType.CheckBox]: -6,
      [DisplayType.NumberBox]: 0,
      [DisplayType.TextBox]: 0,
      [DisplayType.Pick]: 0,
      [DisplayType.TagsBox]: 0,
      [DisplayType.Custom]: 0,
      [DisplayType.Delegate]: 0,
      [DisplayType.Switch]: 0,
    };
  constructor(props)
  {
    super(props);
    this.computeRenderMatrix = memoizeOne(this.computeRenderMatrix);
  }

  public renderCustom(inputInfo: InputDeclarationType<S>, stateName, state: S, index, disabled: boolean)
  {
    const options: OptionType<DisplayType.Custom> = inputInfo.options || {};
    return (
      <div
        className='dynamic-form-default-block'
        key={index}
      >
        {
          inputInfo.displayName ?
            <div className='dynamic-form-label' style={fontColor(Colors().text2)}> {inputInfo.displayName} </div>
            : null
        }
        {options.render(state, disabled)}
      </div>
    );
  }

  public renderSwitch(inputInfo: InputDeclarationType<S>, stateName, state: S, index, disabled: boolean)
  {
    const options: OptionType<DisplayType.Switch> = inputInfo.options || {};
    return (
      <div
        className='dynamic-form-default-block'
        key={index}
      >
        <Switch
          first={options.values.get(0) ? options.values.get(0) : 'Option 1'}
          second={options.values.get(1) ? options.values.get(1) : 'Option 2'}
          selected={this.props.inputState[stateName]}
          onChange={this.setStateHOC(stateName)}
        />
      </div>
    );
  }

  public renderDelegate(inputInfo: InputDeclarationType<S>, stateName, state: S, index, disabled: boolean)
  {
    const options: OptionType<DisplayType.Delegate> = inputInfo.options || {};
    const value = this.props.inputState[stateName];
    const inputKey = options.inputKey || 'inputState';
    const onChangeKey = options.onChangeKey || 'onChange';

    const Component = options.component;

    const renderComponent = (item, listIndex?) =>
    {
      let onChange;
      if (listIndex !== undefined)
      {
        onChange = (val, apply = true) =>
        {
          const newItems = value.slice();
          newItems[listIndex] = val;
          if (apply)
          {
            this.setStateHOC(stateName)(newItems);
          }
          else
          {
            this.setStateNoApplyHOC(stateName)(newItems);
          }
        };
      }
      else
      {
        onChange = (val, apply = true) =>
        {
          if (apply)
          {
            this.setStateHOC(stateName)(val);
          }
          else
          {
            this.setStateNoApplyHOC(stateName)(val);
          }
        };
      }

      return (
        <Component
          {...
          {
            [inputKey]: item,
            [onChangeKey]: onChange,
          }
          }
          disabled={disabled}
        />
      );
    };

    let formElement;
    if (options.isList)
    {
      formElement = (
        <ListForm
          items={value}
          onChange={this.setStateHOC(stateName)}
          newItemDefault={options.listDefaultValue}
          renderItem={renderComponent}
        />
      );
    }
    else
    {
      formElement = renderComponent(value);
    }

    return (
      <div
        className='dynamic-form-default-block'
        key={index}
      >
        <div className='dynamic-form-label' style={fontColor(Colors().text2)}> {inputInfo.displayName} </div>
        {formElement}
      </div>
    );
  }

  public renderTextBox(inputInfo: InputDeclarationType<S>, stateName, state: S, index, disabled: boolean)
  {
    const options: OptionType<DisplayType.TextBox> = inputInfo.options || {};
    return (
      <div
        className='dynamic-form-default-block'
        key={index}
      >
        <div className='dynamic-form-label' style={fontColor(Colors().text2)}> {inputInfo.displayName} </div>
        <Autocomplete
          className='dynamic-form-autocomplete'
          value={this.props.inputState[stateName]}
          onBlur={(ev, val) => this.setStateHOC(stateName)(val)}
          onChange={this.setStateNoApplyHOC(stateName)}
          options={options.acOptions != null ? options.acOptions(state) : emptyList}
          disabled={disabled}
          debounce={options.debounce}
          help={inputInfo.help}
          onEnter={this.props.onTextInputEnter}
        />
      </div>
    );
  }

  // TODO make this only accept numbers
  public renderNumberBox(inputInfo: InputDeclarationType<S>, stateName, state: S, index, disabled: boolean)
  {
    const options: OptionType<DisplayType.NumberBox> = inputInfo.options || {};
    return (
      <div
        className='dynamic-form-default-block'
        key={index}
      >
        <div className='dynamic-form-label' style={fontColor(Colors().text2)}> {inputInfo.displayName} </div>
        <Autocomplete
          className='dynamic-form-autocomplete'
          value={this.props.inputState[stateName]}
          onBlur={(ev, val) => this.setStateNumberBoxHOC(stateName)(val)}
          onChange={this.setStateNoApplyNumberBoxHOC(stateName)}
          options={options.acOptions != null ? options.acOptions(state) : emptyList}
          disabled={disabled}
          debounce={options.debounce}
          help={inputInfo.help}
          onEnter={this.props.onTextInputEnter}
        />
      </div>
    );
  }

  public renderCheckBox(inputInfo: InputDeclarationType<S>, stateName, state: S, index, disabled: boolean)
  {
    const options: OptionType<DisplayType.CheckBox> = inputInfo.options || {};
    return (
      <div
        className='dynamic-form-checkbox-row'
        key={index}
        onClick={noop(disabled,
          this.setStateWithTransformHOC(stateName, (value, inputState) => !inputState[stateName]),
        )}
        style={{ opacity: disabled ? 0.7 : 1 }}
      >
        <CheckBox
          className='dynamic-form-checkbox'
          disabled={disabled}
          checked={this.props.inputState[stateName]}
          onChange={() => null}
          large={options.large}
        />
        <div className='dynamic-form-label'> {inputInfo.displayName} </div>
      </div>
    );
  }

  public renderTagsBox(inputInfo: InputDeclarationType<S>, stateName, state: S, index, disabled: boolean)
  {
    const options: OptionType<DisplayType.TagsBox> = inputInfo.options || {};

    const value = this.props.inputState[stateName] ? this.props.inputState[stateName] : [];
    const transformedValue = options.transformValue !== undefined ?
      options.transformValue(value) : value;

    return (
      <div className='dynamic-form-default-block' key={index}>
        <div className='dynamic-form-label' style={fontColor(Colors().text2)}> {inputInfo.displayName} </div>
        <TagsInput
          value={transformedValue}
          onChange={
            (val) =>
            {
              const untransformedValue = options.untransformValue !== undefined ?
                options.untransformValue(val) : val;

              return this.setStateNoApplyHOC(stateName)(untransformedValue);
            }
          }
          focusedClassName={''}
          inputProps={{ placeholder: 'Add new' }}
        />
      </div>
    );
  }

  public renderPick(inputInfo: InputDeclarationType<S>, stateName, state: S, index, disabled: boolean)
  {
    const options: OptionType<DisplayType.Pick> = inputInfo.options || {};
    let selectedIndex;
    let onChange;
    const pickOptions = options.pickOptions != null ? options.pickOptions(state) : emptyList;
    if (options.indexResolver != null)
    {
      selectedIndex = options.indexResolver(this.props.inputState[stateName]);
      onChange = (value) => { this.setStateHOC(stateName)(pickOptions.get(value)); };
    }
    else
    {
      selectedIndex = this.props.inputState[stateName];
      onChange = this.setStateHOC(stateName);
    }
    const displayNames = options.displayNames != null ? options.displayNames(state) : undefined;
    return (
      <div className='dynamic-form-default-block' key={index}>
        <div className='dynamic-form-label' style={fontColor(Colors().text2)}> {inputInfo.displayName} </div>
        <span style={{ marginLeft: '0px' }}>
          <Dropdown
            className='dynamic-form-pick'
            openDown={true}
            selectedIndex={selectedIndex}
            onChange={onChange}
            options={pickOptions}
            canEdit={!disabled}
            optionsDisplayName={displayNames}
            textColor={options.textColor}
            wrapperHeight={options.wrapperHeight}
          />
        </span>
      </div>
    );
  }

  public getCellStyle(
    inputInfo: InputDeclarationType<S>,
    preRender: PreRenderInfo,
  ): object
  {
    const { displayState, yCenterOffset } = preRender;
    const widthFactor = inputInfo.widthFactor ? inputInfo.widthFactor : 4;

    const style = {
      display: displayState === DisplayState.Hidden ? 'none' : undefined,
      position: 'relative',
      top: `${-1 * yCenterOffset}px`,
    };

    if (widthFactor !== -1)
    {
      _.extend(style, { width: `${widthFactor * widthBase}px` });
    }

    if (inputInfo.style !== undefined)
    {
      return _.extend(style, inputInfo.style);
    }
    else
    {
      return style;
    }
  }

  public getRowStyle(preRenders: List<PreRenderInfo>): object
  {
    const visible = preRenders.findIndex((value) => value.displayState !== DisplayState.Hidden);
    return {
      display: visible === -1 ? 'none' : undefined,
    };
  }

  public renderInputElement(
    inputInfo: InputDeclarationType<S>,
    stateName,
    preRenders: List<PreRenderInfo>,
    state: S,
    index,
  ): any
  {
    const renderFn: renderSignature<S> = this.renderFnLookup[inputInfo.type];
    const renderInfo = preRenders.get(index);
    return (
      <div
        key={index}
        style={this.getCellStyle(inputInfo, renderInfo)}
        className='dynamic-form-cell'
      >
        {renderFn(inputInfo, stateName, state, index, renderInfo.displayState === DisplayState.Inactive)}
      </div>
    );
  }

  public computePreRenderInfo(inputInfo: InputDeclarationType<S>, stateName, state: S, index): PreRenderInfo
  {
    const displayState = inputInfo.getDisplayState(state);
    const yCenterOffset = this.yOffsetLookup[inputInfo.type];

    return {
      displayState,
      yCenterOffset,
    };
  }

  public renderInputElementFactory(inputInfo, stateName)
  {
    return {
      render: ((state, index, preRender) => this.renderInputElement(inputInfo, stateName, preRender, state, index)),
      preRender: ((state, index) => this.computePreRenderInfo(inputInfo, stateName, state, index)),
    };
  }

  public computeCellInfo(cellFn: MatrixCellFn<S>, index)
  {
    return cellFn.preRender(this.props.inputState, index);
  }

  public renderMatrixRow(row: MatrixRowType<S>, index)
  {
    const preRenderInfo = row.map(this.computeCellInfo).toList();
    const renderFn = (cell: MatrixCellFn<S>, i) =>
    {
      return cell.render(this.props.inputState, i, preRenderInfo);
    };
    const rowStyle = this.getRowStyle(preRenderInfo);

    return (
      <div
        key={index}
        className='dynamic-form-matrix-row'
        style={rowStyle}
      >
        {
          row.map(renderFn)
        }
      </div>
    );
  }

  public renderButton(buttonOptions: ButtonOptions, defaults: Partial<ButtonOptions>, key)
  {
    const options: ButtonOptions = _.defaults({}, buttonOptions, defaults);
    const buttonStyle = getButtonStyle(options.isActive, options.disabled);
    return (
      <div
        className={classNames({
          'dynamic-form-button': true,
          'dynamic-form-button-active': options.isActive,
          'dynamic-form-button-disabled': options.disabled,
        })}
        style={buttonStyle}
        onClick={!options.disabled && options.onClicked}
        key={key}
      >
        {options.name}
      </div>
    );
  }

  public renderConfirmBar()
  {
    const mainButton = this.props.mainButton === undefined ? null :
      this.renderButton(this.props.mainButton, { isActive: true, disabled: false }, 'main');
    const secondButton = this.props.secondButton === undefined ? null :
      this.renderButton(this.props.secondButton, { isActive: false, disabled: false }, 'second');
    const thirdButton = this.props.thirdButton === undefined ? null :
      this.renderButton(this.props.thirdButton, { isActive: false, disabled: false }, 'third');
    if (mainButton === null && secondButton === null && thirdButton === null)
    {
      return null;
    }

    return (
      <div className='dynamic-form-confirm-bar' style={this.props.actionBarStyle}>
        {thirdButton}
        {secondButton}
        {mainButton}
      </div>
    );
  }

  public renderErrors()
  {
    if (this.props.validate !== undefined)
    {
      const msg = this.props.validate(this.props.inputState);
      if (msg !== undefined)
      {
        return (
          <div
            className='dynamic-form-errors'
            style={[fontColor(Colors().error), getStyle('width', widthBase * 4)]}
          >
            {msg}
          </div>
        );
      }
    }
    else
    {
      return null;
    }
  }

  public render()
  {
    const renderMatrix: MatrixType<S> = this.computeRenderMatrix(this.props.inputMap);
    return (
      <div className='dynamic-form' style={this.props.style}>
        {this.props.centerForm ?
          <div style={{ flexGrow: 1 }} /> : null
        }
        {renderMatrix.map(this.renderMatrixRow)}
        {this.renderErrors()}
        {this.props.children !== undefined ? this.props.children : null}
        {this.renderConfirmBar()}
        hiiiiiiiii
      </div>
    );
  }

  // gets memoized
  public computeRenderMatrix(inputMap: InputDeclarationMap<S>)
  {
    let renderMatrix: MatrixType<S> = List([]);
    const groupToIndex = {};
    for (const stateName of Object.keys(inputMap))
    {
      const { group } = inputMap[stateName];
      // set defaults
      const inputInfo: InputDeclarationType<S> = _.defaults(
        {},
        inputMap[stateName],
        { getDisplayState: () => DisplayState.Active },
      );

      // build the render matrix
      let useIndex = renderMatrix.size;
      if (group !== undefined)
      {
        // set groupToIndex[group] to be the next index, if it doesn't exist. Otherwise don't change it
        groupToIndex[group] = _.get(groupToIndex, group, useIndex);
        useIndex = groupToIndex[group];
      }
      // renderMatrix is a 2D matrix of functions
      renderMatrix = renderMatrix.updateIn([useIndex], List([]), (value) => value.push(
        this.renderInputElementFactory(inputInfo, stateName),
      ));
    }
    return renderMatrix;
  }

  // optional transformValue can change the value based on the state. This function is not transformed
  public setStateWithTransformHOC(stateName, transformValue: (value, state?: S) => any = (value) => value)
  {
    return (value) =>
    {
      const shallowCopy = _.clone(this.props.inputState);
      const newValue = transformValue(value, this.props.inputState);
      shallowCopy[stateName] = newValue;
      this.props.onStateChange(shallowCopy);
    };
  }

  @instanceFnDecorator(_.memoize)
  public setStateHOC(stateName)
  {
    return (value) =>
    {
      const shallowCopy = _.clone(this.props.inputState);
      shallowCopy[stateName] = value;

      this.props.onStateChange(shallowCopy, true);
    };
  }

  @instanceFnDecorator(_.memoize)
  public setStateNoApplyHOC(stateName)
  {
    return (value) =>
    {
      const shallowCopy = _.clone(this.props.inputState);
      shallowCopy[stateName] = value;

      this.props.onStateChange(shallowCopy, false);
    };
  }

  @instanceFnDecorator(_.memoize)
  public setStateNumberBoxHOC(stateName)
  {
    const setState = this.setStateHOC(stateName);
    return (value) =>
    {
      const asNum = Number(value);
      if (!Number.isNaN(asNum))
      {
        setState(asNum);
      }
    };
  }

  @instanceFnDecorator(_.memoize)
  public setStateNoApplyNumberBoxHOC(stateName)
  {
    const setState = this.setStateNoApplyHOC(stateName);
    return (value) =>
    {
      const asNum = Number(value);
      if (!Number.isNaN(asNum))
      {
        setState(asNum);
      }
    };
  }
}

const widthBase = 56; // subject to change

interface PreRenderInfo
{
  yCenterOffset: number;
  displayState: DisplayState;
}

type MatrixType<S> = List<MatrixRowType<S>>; // list of list of functions
type MatrixRowType<S> = List<MatrixCellFn<S>>;
interface MatrixCellFn<S>
{
  render: (state: S, key, preRender: List<PreRenderInfo>) => any;
  preRender: (state: S, key) => PreRenderInfo;
}
type renderSignature<S> =
  (
    inputInfo: InputDeclarationType<S>,
    stateName: string,
    state: S,
    index: number,
    disabled: boolean,
  ) => any;

function noop(disabled: boolean, fn)
{
  return disabled ? () => null : fn;
}

// memoized
let getButtonStyle = (active: boolean, disabled: boolean) =>
{
  if (active)
  {
    return disabled ? [
      fontColor(Colors().activeText),
      backgroundColor(Colors().activeHover, Colors().activeHover),
      borderColor(Colors().altBg2),
    ] : [
        backgroundColor(Colors().active, Colors().activeHover),
        borderColor(Colors().active, Colors().activeHover),
        fontColor(Colors().activeText),
      ];
  }
  else
  {
    return disabled ? [
      fontColor(Colors().text3, Colors().text3),
      backgroundColor(Color(Colors().bg2).alpha(0.5).toString(), Color(Colors().bg2).alpha(0.5).toString()),
      borderColor(Colors().bg2),
    ] : [
        fontColor(Colors().text2, Colors().text3),
        backgroundColor(Colors().bg2, Color(Colors().bg2).alpha(0.5).toString()),
        borderColor(Colors().bg1),
      ];
  }
};
function resolveBooleans(a, b)
{
  return a ? (b ? 'tt' : 'tf') : (b ? 'ft' : 'ff');
}
getButtonStyle = _.memoize(getButtonStyle, resolveBooleans);
const emptyList = List([]);
