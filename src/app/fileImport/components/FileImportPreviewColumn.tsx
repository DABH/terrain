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

import * as Radium from 'radium';
import * as React from 'react';
import { Colors } from '../../common/Colors';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import TerrainComponent from './../../common/components/TerrainComponent';
import TransformBox from './../components/TransformBox';
import TypeDropdown from './../components/TypeDropdown';
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
import './FileImportPreviewColumn.less';

type ColumnTypesTree = FileImportTypes.ColumnTypesTree;

export interface Props
{
  columnId: number;
  columnName: string;
  columnNames: List<string>; // TODO: move to parent component while preserving split/merge functionality
  isIncluded: boolean;
  columnType: ColumnTypesTree;
  isPrimaryKey: boolean;
  columnOptions: List<string>;
  exporting: boolean;
  onColumnNameChange(columnId: number, localColumnName: string);
  onTransform(columnId: number);
}

@Radium
class FileImportPreviewColumn extends TerrainComponent<Props>
{
  public state: {
    localColumnName: string;
  } = {
    localColumnName: this.props.columnName,
  };

  public handleIncludedChange()
  {
    Actions.setColumnToInclude(this.props.columnId);
  }

  public handlePrimaryKeyChange()
  {
    Actions.changePrimaryKey(this.props.columnId);
  }

  public handleLocalColumnNameChange(localColumnName: string)
  {
    this.setState({
      localColumnName,
    });
  }

  public handleRename()
  {
    const success: boolean = this.props.onColumnNameChange(this.props.columnId, this.state.localColumnName);
    if (!success)
    {
      this.setState({
        localColumnName: this.props.columnName,
      });
    }
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.columnName !== nextProps.columnName)
    {
      this.setState({
        localColumnName: nextProps.columnName,
      });
    }
  }

  public renderIncluded()
  {
    return (
      <div
        className='flex-container fi-preview-column-field'
      >
        <div
          className='fi-preview-column-field-name'
        >
          <CheckBox
            checked={this.props.isIncluded}
            onChange={this.handleIncludedChange}
          />
        </div>
        <span
          className='fi-preview-column-field-content clickable'
          onClick={this.handleIncludedChange}
        >
          Include Column
          </span>
      </div>
    );
  }

  public renderPrimaryKey()
  {
    if (!this.props.exporting)
    {
      return (
        <div
          className='flex-container fi-preview-column-field'
        >
          <div
            className='fi-preview-column-field-name'
          >
            <CheckBox
              checked={this.props.isPrimaryKey}
              onChange={this.handlePrimaryKeyChange}
            />
          </div>
          <span
            className='fi-preview-column-field-content clickable'
            onClick={this.handlePrimaryKeyChange}
          >
            Primary Key
          </span>
        </div>
      );
    }
  }

  public renderName()
  {
    return (
      <div
        className='flex-container fi-preview-column-field'
      >
        <div
          className='fi-preview-column-field-content'
        >
          <Autocomplete
            value={this.state.localColumnName}
            options={this.props.columnOptions}
            onChange={this.handleLocalColumnNameChange}
            placeholder={''}
            disabled={false}
            onEnter={this.handleRename}
            onSelectOption={this.handleRename}
            onBlur={this.handleRename}
          />
        </div>
      </div>
    );
  }

  public renderType()
  {
    if (!this.props.exporting)
    {
      return (
        <div
          className='flex-container fi-preview-column-field'
        >
          <div
            className='fi-preview-column-field-content'
          >
            <TypeDropdown
              columnId={this.props.columnId}
              recursionDepth={0}
              columnType={this.props.columnType}
            />
          </div>
        </div>
      );
    }
  }

  public renderTransform()
  {
    const { props } = this;
    return (
      <div
        className='flex-container fi-preview-column-field'
      >
        <div
          className='fi-preview-column-field-content'
          onClick={this._fn(this.props.onTransform, this.props.columnId)}
        >
          Transform
        </div>
      </div>
    );
  }

  public renderColumn()
  {
    return (
      <div
        className='fi-preview-column'
        style={{
          background: Colors().bg2,
          text: Colors().text1,
        }}
      >
        {this.renderIncluded()}
        {this.renderPrimaryKey()}
        {this.renderName()}
        {this.renderType()}
        {this.renderTransform()}
      </div>
    );
  }

  public render()
  {
    return this.renderColumn();
  }
}

export default FileImportPreviewColumn;
