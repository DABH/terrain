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

// tslint:disable:no-var-requires strict-boolean-expressions max-line-length

import * as Immutable from 'immutable';
import * as Papa from 'papaparse';
import * as Radium from 'radium';
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import * as _ from 'underscore';
import { server } from '../../../../midway/src/Midway';
import { backgroundColor, buttonColors, Colors, fontColor, link } from '../../common/Colors';
import { isValidIndexName, isValidTypeName, parseJSONSubset } from './../../../../shared/fileImport/Util';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import SchemaStore from './../../schema/data/SchemaStore';
import { databaseId, tableId } from './../../schema/SchemaTypes';
import * as SchemaTypes from './../../schema/SchemaTypes';
import Actions from './../data/FileImportActions';
import FileImportStore from './../data/FileImportStore';
import * as FileImportTypes from './../FileImportTypes';
import './FileImport.less';
import FileImportPreview from './FileImportPreview';
const HTML5Backend = require('react-dnd-html5-backend');
const { List } = Immutable;

export interface Props
{
  params?: any;
  location?: any;
  router?: any;
  route?: any;
}

@Radium
class FileImport extends TerrainComponent<any>
{
  public state: {
    fileImportState: FileImportTypes.FileImportState;
    columnOptionNames: List<string>;
    stepId: number;

    servers?: SchemaTypes.ServerMap;
    serverNames: List<string>;
    serverIndex: number;
    serverSelected: boolean;

    dbs?: SchemaTypes.DatabaseMap;
    dbNames: List<string>;
    dbSelected: boolean;

    tables?: SchemaTypes.TableMap;
    tableNames: List<string>;
    tableSelected: boolean;

    fileSelected: boolean;
    file: string;
    filetype: string;
    filename: string;
  } = {
    fileImportState: FileImportStore.getState(),
    columnOptionNames: List([]),
    stepId: 0,

    serverIndex: -1,
    serverNames: List([]),
    serverSelected: false,

    dbNames: List([]),
    dbSelected: false,

    tableNames: List([]),
    tableSelected: false,

    fileSelected: false,
    file: '',
    filetype: '',
    filename: '',
  };

  constructor(props)
  {
    super(props);

    this._subscribe(FileImportStore, {
      stateKey: 'fileImportState',
    });

    this._subscribe(SchemaStore, {
      updater: (schemaState: SchemaTypes.SchemaState) =>
      {
        this.setState({
          servers: schemaState.servers,
          dbs: schemaState.databases,
          tables: schemaState.tables,
          serverNames: schemaState.servers.keySeq().toList(),
        });
      },
    });
  }

  public handleNextStepChange()
  {
    switch (this.state.stepId)
    {
      case 0:
        if (!this.state.fileSelected)
        {
          alert('Please select a file');
          return;
        }
        const isSuccess = this.parseAndChooseFile(this.state.file, this.state.filetype);
        if (!isSuccess)
        {
          return;
        }
        break;
      case 1:
        if (!this.state.serverSelected)
        {
          alert('Please select a server');
          return;
        }
        break;
      case 2:
        if (!this.state.dbSelected)
        {
          alert('Please select or enter a database');
          return;
        }
        let msg = isValidIndexName(this.state.fileImportState.dbText);
        if (msg)
        {
          alert(msg);
          return;
        }
        break;
      case 3:
        if (!this.state.tableSelected)
        {
          alert('Please select or enter a table');
          return;
        }
        msg = isValidTypeName(this.state.fileImportState.tableText);
        if (msg)
        {
          alert(msg);
          return;
        }
        break;
      default:
    }
    this.setState({
      stepId: this.state.stepId + 1,
    });
  }

  public handlePrevStepChange()
  {
    this.setState({
      stepId: this.state.stepId - 1,
    });
  }

  public handleCsvHeaderChange()
  {
    Actions.changeHasCsvHeader();
  }

  public handleServerChange(serverIndex: number)
  {
    const { servers, serverNames } = this.state;
    const serverName = serverNames.get(serverIndex);
    this.setState({
      serverIndex,
      serverSelected: true,
      dbNames: List(servers.get(serverName).databaseIds.map((db) =>
        db.split('/').pop(),
      )),
    });

    Actions.changeServer(this.state.servers.get(serverName).connectionId, serverName);
  }

  public handleAutocompleteDbChange(dbText: string)
  {
    const { dbs } = this.state;
    const { serverText } = this.state.fileImportState;
    this.setState({
      dbSelected: !!dbText,
      tableNames: dbText && dbs.get(databaseId(serverText, dbText)) ?
        List(dbs.get(databaseId(serverText, dbText)).tableIds.map((table) =>
          table.split('.').pop(),
        ))
        :
        List([]),
    });

    Actions.changeDbText(dbText);
  }

  public handleAutocompleteTableChange(tableText: string)
  {
    const { tables } = this.state;
    const { serverText, dbText } = this.state.fileImportState;
    this.setState({
      tableSelected: !!tableText,
      columnOptionNames: tableText && tables.get(tableId(serverText, dbText, tableText)) ?
        List(tables.get(tableId(serverText, dbText, tableText)).columnIds.map((column) =>
          column.split('.').pop(),
        ))
        :
        List([]),
    });

    Actions.changeTableText(tableText);
  }

  public parseJson(file: string): object[]
  {
    const items = parseJSONSubset(file, FileImportTypes.NUMBER_PREVIEW_ROWS);
    if (!Array.isArray(items))
    {
      alert('Input JSON file must parse to an array of objects.');
      return [];
    }
    return items;
  }

  public parseCsv(file: string): object[]
  {
    const { csvHeaderMissing } = this.state.fileImportState;

    if (!csvHeaderMissing)
    {
      const testDuplicateConfig = {
        quoteChar: '\'',
        header: false,
        preview: 1,
        skipEmptyLines: true,
      };

      const columnHeaders = Papa.parse(file, testDuplicateConfig).data;

      const colHeaderSet = new Set();
      const duplicateHeaderSet = new Set();
      columnHeaders[0].map((colHeader) =>
      {
        if (colHeaderSet.has(colHeader))
        {
          duplicateHeaderSet.add(colHeader);
        }
        else
        {
          colHeaderSet.add(colHeader);
        }
      });
      if (duplicateHeaderSet.size > 0)
      {
        alert('duplicate column names not allowed: ' + JSON.stringify(Array.from(duplicateHeaderSet)));
        return [];
      }
    }
    const config = {
      quoteChar: '\'',
      header: !csvHeaderMissing,
      preview: FileImportTypes.NUMBER_PREVIEW_ROWS,
      error: (err) =>
      {
        alert('CSV format incorrect: ' + String(err));
      },
      skipEmptyLines: true,
    };

    const items = Papa.parse(file, config).data;
    for (let i = 1; i < items.length; i++)
    {
      if (items[i].length !== items[0].length)
      {
        alert('CSV format incorrect: each row must have same number of fields');
        return [];
      }
    }
    return items;
  }

  public parseAndChooseFile(file: string, filetype: string): boolean
  {
    const { csvHeaderMissing } = this.state.fileImportState;
    let items = [];
    switch (filetype)
    {
      case 'json':
        items = this.parseJson(file);
        break;
      case 'csv':
        items = this.parseCsv(file);
        break;
      default:
    }
    if (items.length === 0)
    {
      return false;
    }

    const columnNames = _.map(items[0], (value, index) =>
      filetype === 'csv' && csvHeaderMissing ? 'column ' + String(index) : index,
    );
    const previewRows = items.map((item, i) =>
      _.map(item, (value, key) =>
        typeof value === 'string' ? value : JSON.stringify(value),
      ),
    );

    Actions.chooseFile(file, filetype, List<List<string>>(previewRows), List<string>(columnNames));
    return true;
  }

  public handleSelectFile(file)
  {
    const fileSelected = !!file.target.files[0];
    if (!fileSelected)
    {
      return;
    }
    this.setState({
      fileSelected,
      filename: file.target.files[0].name,
    });

    const filetype = file.target.files[0].name.split('.').pop();
    if (FileImportTypes.FILE_TYPES.indexOf(filetype) === -1)
    {
      alert('Invalid filetype: ' + String(filetype));
      return;
    }

    const fr = new FileReader();
    fr.readAsText(file.target.files[0]);

    fr.onloadend = () =>
    {
      this.setState({
        file: fr.result,
        filetype,
      });
      this.refs['file']['value'] = null; // prevent file-caching
    };
  }

  public renderSteps()
  {
    return (
      <div className='fi-step'>
        <div className='fi-step-name'>
          {
            FileImportTypes.STEP_NAMES[this.state.stepId]
          }
        </div>
        <div className='fi-step-title'>
          {
            FileImportTypes.STEP_TITLES[this.state.stepId]
          }
        </div>
      </div>
    );
  }

  public renderContent()
  {
    const { fileImportState } = this.state;
    const { dbText, tableText, previewRows, columnNames, columnsToInclude, columnsCount, columnTypes, csvHeaderMissing,
      primaryKey, templates, transforms, uploadInProgress, elasticUpdate } = fileImportState;

    let content = {};
    switch (this.state.stepId)
    {
      case 0:
        content =
          <div>
            <input ref='file' type='file' name='abc' onChange={this.handleSelectFile} />
            has header row (csv only)
            <CheckBox
              checked={!csvHeaderMissing}
              onChange={this.handleCsvHeaderChange}
            />
            {
              this.state.filename ? this.state.filename + ' selected' : 'no file selected'
            }
          </div>;
        break;
      case 1:
        content =
          <Dropdown
            selectedIndex={this.state.serverIndex}
            options={this.state.serverNames}
            onChange={this.handleServerChange}
            canEdit={true}
          />;
        break;
      case 2:
        content =
          <Autocomplete
            value={dbText}
            options={this.state.dbNames}
            onChange={this.handleAutocompleteDbChange}
            placeholder={'database'}
            disabled={false}
          />;
        break;
      case 3:
        content =
          <Autocomplete
            value={tableText}
            options={this.state.tableNames}
            onChange={this.handleAutocompleteTableChange}
            placeholder={'table'}
            disabled={false}
          />;
        break;
      case 4:
        content =
          <FileImportPreview
            previewRows={previewRows}
            columnsCount={columnsCount}
            primaryKey={primaryKey}
            columnNames={columnNames}
            columnsToInclude={columnsToInclude}
            columnTypes={columnTypes}
            templates={templates}
            transforms={transforms}
            columnOptions={this.state.columnOptionNames}
            uploadInProgress={uploadInProgress}
            elasticUpdate={elasticUpdate}
          />;
        break;
      default:
    }

    return (
      <div
        className='fi-content'
      >
        {
          content
        }
      </div>
    );
  }

  public renderNav()
  {
    return (
      <div
        className='fi-nav'
      >
        {
          this.state.stepId > 0 &&
          <div
            className='fi-back-button'
            onClick={this.handlePrevStepChange}
            style={buttonColors()}
            ref='fi-back-button'
          >
            &lt; back
          </div>
        }
        {
          this.state.stepId < 4 &&
          <div
            className='fi-next-button'
            onClick={this.handleNextStepChange}
            style={buttonColors()}
            ref='fi-next-button'
          >
            next &gt;
          </div>
        }
      </div>
    );
  }

  public render()
  {
    return (
      <div
        className='file-import'
      >
        <div
          className='file-import-inner'
        >
          {this.renderSteps()}
          {this.renderContent()}
          {this.renderNav()}
        </div>
      </div>
    );
  }
}

// ReactRouter does not like the output of DragDropContext, hence the `any` cast
const ExportFileImport = DragDropContext(HTML5Backend)(FileImport) as any;

export default ExportFileImport;
