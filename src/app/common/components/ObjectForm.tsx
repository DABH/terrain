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
// tslint:disable:no-var-requires import-spacing
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

import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import Quarantine from 'util/RadiumQuarantine';

import './ObjectForm.less';
const DeleteIcon = require('images/icon_close.svg');

interface Props
{
  object: object | object[];
  keyName?: string;
  valueName?: string;
  onChange: (newValue: object, apply?: boolean) => void;
  label?: string;
}

interface KVPair
{
  key: string;
  value: string;
}

// performance of this component can be optimized
export default class ObjectForm extends TerrainComponent<Props>
{
  public rowInputMap: InputDeclarationMap<KVPair> = {
    key: {
      type: DisplayType.TextBox,
      displayName: 'Field',
      group: 'main',
      widthFactor: 3,
    },
    value: {
      type: DisplayType.TextBox,
      displayName: 'Value',
      group: 'main',
      widthFactor: 3,
    },
  };

  public renderAddNewRow()
  {
    return (
      <PathfinderCreateLine
        text={'New Field'}
        canEdit={true}
        onCreate={this.addRow}
        showText={true}
        style={overrideCreateStyle}
      />
    );
  }

  public renderRow(key: string | object, index: number)
  {
    if (!Array.isArray(this.props.object))
    {
      const value = this.props.object[key as string];

      return (
        <div
          key={index}
          className='object-form-row'
        >
          <DynamicForm
            inputMap={this.rowInputMap}
            inputState={{ key, value }}
            onStateChange={this.rowChangeFactory(index)}
          />
          <Quarantine>
            <div
              className='object-form-row-delete'
              style={fontColor(Colors().text3, Colors().text2)}
              onClick={this.handleDeleteRowFactory(index)}
            >
              <DeleteIcon />
            </div>
          </Quarantine>
        </div>
      );
    }
    else
    {
      const value = this.props.object[index];
      const inputStateObj: object = key as object;
      // inputStateObj[this.props.keyName] = key as object;
      // inputStateObj[this.props.valueName] = value;
      return (
        <div
          key={index}
          className='object-form-row'
        >
          <DynamicForm
            inputMap={this.rowInputMap}
            inputState={inputStateObj}
            onStateChange={this.rowChangeFactory(index)}
          />
          <Quarantine>
            <div
              className='object-form-row-delete'
              style={fontColor(Colors().text3, Colors().text2)}
              onClick={this.handleDeleteRowFactory(index)}
            >
              <DeleteIcon />
            </div>
          </Quarantine>
        </div>
      );
    }
  }

  public render()
  {
    if (!Array.isArray(this.props.object))
    {
      const keys = List(Object.keys(this.props.object));
      return (
        <div className='object-form-container'>
          {
            this.props.label === undefined ? null :
              <div className='object-form-label'>
                {this.props.label}
              </div>
          }
          <div className='object-kv-body' style={borderColor(Colors().border1)}>
            {keys.map(this.renderRow)}
            {this.renderAddNewRow()}
          </div>
        </div>
      );
    }
    else
    {
      const rows = List(this.props.object);
      return (
        <div className='object-form-container'>
          {
            this.props.label === undefined ? null :
              <div className='object-form-label'>
                {this.props.label}
              </div>
          }
          <div className='object-kv-body' style={borderColor(Colors().border1)}>
            {rows.map(this.renderRow)}
            {this.renderAddNewRow()}
          </div>
        </div>
      );
    }
  }

  @instanceFnDecorator(_.memoize)
  public handleDeleteRowFactory(index: number)
  {
    return () =>
    {
      if (!Array.isArray(this.props.object))
      {
        const keyToDelete = Object.keys(this.props.object)[index];
        const newState = _.extend({}, this.props.object);
        delete newState[keyToDelete];
        this.props.onChange(newState, true);
      }
      else
      {
        const newState = this.props.object.slice();
        newState.splice(index, 1);
        this.props.onChange(newState, true);
      }
    };
  }

  @instanceFnDecorator(_.memoize)
  public rowChangeFactory(index: number)
  {
    return (newKV: KVPair, apply) =>
    {
      const oldKey = Object.keys(this.props.object)[index];
      const newState = _.extend({}, this.props.object);

      if (oldKey !== newKV.key)
      {
        if (newState[newKV.key] === undefined)
        {
          delete newState[oldKey];
        }
        else
        {
          this.props.onChange(this.props.object, apply);
          return;
        }
      }
      newState[newKV.key] = newKV.value;
      this.props.onChange(newState, apply);
    };
  }

  // please refactor this if this form becomes stateful
  public addRow()
  {
    const { keyName, object, onChange, valueName } = this.props;
    if (!Array.isArray(object))
    {
      // find a unique key
      let newName = 'New Field';
      for (let i = 1; i < 100; i++) // is there a better way to do this?
      {
        if (object[newName] === undefined)
        {
          break;
        }
        else
        {
          newName = `New Field ${i}`;
        }
      }
      if (object[newName] !== undefined)
      {
        newName = `Field ${this.randomId()}`;
      }

      const newState = _.extend({}, object);
      newState[newName] = '';
      onChange(newState, true);
    }
    else
    {
      if (keyName !== undefined && valueName !== undefined)
      {
        const newObj: object = {};
        newObj[keyName] = 'New Field';
        newObj[valueName] = '';
        const newState = object.slice();
        newState.push(newObj);
        onChange(newState, true);
      }
    }
  }

  public randomId(): string
  {
    return Math.random().toString(36).substring(2);
  }
}

const overrideCreateStyle = {
  height: '24px',
};
