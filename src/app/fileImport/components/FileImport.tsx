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
import * as Immutable from 'immutable';
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import PureClasss from './../../common/components/PureClasss';;
import FileImportStore from './../data/FileImportStore';
import FileImportInfo from './FileImportInfo';
import FileImportTypes from './../FileImportTypes';
const HTML5Backend = require('react-dnd-html5-backend');
import SchemaStore from './../../schema/data/SchemaStore';
import SchemaTypes from './../../schema/SchemaTypes';
import Preview from './Preview';

const { List, Map } = Immutable;

export interface Props
{
  params?: any;
  location?: any;
  router?: any;
  route?: any;
}

const FILETYPES = Immutable.List(['json', 'csv']);
const ROWS_COUNT = 10;

class FileImport extends PureClasss<any>
{
  public state: {
    fileImportState: FileImportTypes.FileImportState;
    servers?: SchemaTypes.ServerMap;
    serverNames?: List<string>;
    dbNames?: List<string>;
    tableNames?: List<string>;
  } = {
    fileImportState: FileImportStore.getState(),
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
          serverNames: this.getKeyListSafely(schemaState.servers),
          dbNames: this.getKeyListSafely(schemaState.databases),
          tableNames: this.getKeyListSafely(schemaState.tables),
        });
      }
    });
  }

  public render()
  {
    const { fileImportState } = this.state;
    const { serverSelected, serverIndex, dbSelected, dbText, tableSelected, tableText, fileChosen, previewRows,
      columnsToInclude, columnNames, columnsCount, columnTypes, hasCsvHeader, primaryKey } = fileImportState;

    return (
      <div className="fileImport">
        <h2>File Import Page</h2>
        <div>
          <FileImportInfo
            canSelectServer={true}
            servers={this.state.servers}
            serverNames={this.state.serverNames}
            serverIndex={serverIndex}
            serverSelected={serverSelected}
            canSelectDb={true}
            dbs={this.state.dbNames}
            dbText={dbText}
            dbSelected={dbSelected}
            canSelectTable={true}
            tables={this.state.tableNames}
            tableText={tableText}
            tableSelected={tableSelected}
            canImport={true}
            validFiletypes={FILETYPES}
            fileChosen={fileChosen}
            rowsCount={ROWS_COUNT}
            hasCsvHeader={hasCsvHeader}
          />
        </div>
        {
          previewRows &&
          <Preview
            previewRows={previewRows}
            rowsCount={Math.min(ROWS_COUNT, previewRows.length)}
            columnsCount={columnsCount}
            primaryKey={primaryKey}
            columnsToInclude={columnsToInclude}
            columnNames={columnNames}
            columnTypes={columnTypes}
          />
        }
      </div>
    );
  }

  private getKeyListSafely(map: IMMap<string, any>)
  {
    if (map === undefined)
    {
      return List<string>();
    }
    return map.keySeq().toList();
  }
}

// ReactRouter does not like the output of DragDropContext, hence the `any` cast
const ExportFileImport = DragDropContext(HTML5Backend)(FileImport) as any;

export default ExportFileImport;
