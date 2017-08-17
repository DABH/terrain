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

// tslint:disable:strict-boolean-expressions no-console

import { List, Map } from 'immutable';
import * as React from 'react';
import * as ReactDataGrid from 'react-data-grid';
import { Toolbar } from 'react-data-grid-addons';

import * as _ from 'underscore';

import { _ResultsConfig, ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import InfoArea from '../../../common/components/InfoArea';
import { Table, TableColumn } from '../../../common/components/Table';
import TerrainComponent from '../../../common/components/TerrainComponent';
import ColorManager from '../../../util/ColorManager';
import { spotlightAction, SpotlightState, SpotlightStore } from '../../data/SpotlightStore';
import { getResultFields, getResultName, getResultValue } from './Result';
import { MAX_RESULTS, Results } from './ResultTypes';

export interface Props
{
  results: Results;
  resultsConfig?: ResultsConfig;
  onExpand: (index: number) => void;
  resultsLoading: boolean;
}

export default class ResultsTable extends TerrainComponent<Props>
{
  public state: {
    random: number;
    spotlightState: SpotlightState;
    columns: List<TableColumn>;
    rows: List<any>;
    selectedIndexes: List<any>;
  } = {
    random: 0,
    spotlightState: null,
    columns: this.getColumns(this.props),
    rows: List([]),
    selectedIndexes: List([]),
  };

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.results !== this.props.results || nextProps.resultsConfig !== this.props.resultsConfig)
    {
      // force the table to update
      this.setState({
        random: Math.random(),
        columns: this.getColumns(nextProps),
        rows: nextProps.results,
      });
    }
  }

  public getColumns(props: Props): List<TableColumn>
  {
    const { resultsConfig } = props;
    let cols: TableColumn[] = [];

    if (resultsConfig.enabled)
    {
      if (resultsConfig.name)
      {
        cols.push({
          key: resultsConfig.name,
          name: resultsConfig.name,
          filterable: true,
          resizable: true,
          sortable: true,
        });
      }

      if (resultsConfig.score)
      {
        cols.push({
          key: resultsConfig.score,
          name: resultsConfig.score,
          filterable: true,
          resizable: true,
          sortable: true,
        });
      }
    }

    if (resultsConfig.enabled && resultsConfig.fields && resultsConfig.fields.size)
    {
      resultsConfig.fields.map(
        (field) =>
          cols.push({
            key: field,
            name: field,
            filterable: true,
            resizable: true,
            sortable: true,
          }),
      );
    }
    else
    {
      const resultFields = props.results.size ? props.results.get(0).fields : Map({});
      resultFields.map(
        (value, field) =>
          cols.push({
            key: field,
            name: field,
            filterable: true,
            resizable: true,
            sortable: true,
            width: 120,
          }),
      );
    }

    // NOTE: Passing any empty cols array will cause our table library to crashhhh
    if (cols.length === 0)
    {
      if (this.props.resultsLoading)
      {
        cols = [
          {
            key: 'loading',
            name: 'Loading...',
          },
        ];
      }
      else
      {
        cols = [
          {
            key: 'none',
            name: 'No results',
          },
        ];
      }
    }

    return List(cols);
  }

  public componentDidMount()
  {
    this._subscribe(SpotlightStore, {
      isMounted: true,
      stateKey: 'spotlightState',
    });

    this.setState({ rows: this.props.results });
  }

  public getRow(i: number): object
  {
    return this.state.rows.get(i).fields.toJS();
  }

  public onRowsSelected(rows)
  {
    const rowIndexes = rows.map((r) =>
    {
      this.spotlight(r.rowIdx);
      return r.rowIdx;
    });
    this.setState({ selectedIndexes: this.state.selectedIndexes.concat(rowIndexes) });
  }

  public onRowsDeselected(rows)
  {
    const rowIndexes = rows.map((r) =>
    {
      this.unspotlight(r.rowIdx);
      return r.rowIdx;
    });
    this.setState({ selectedIndexes: this.state.selectedIndexes.filter((i) => rowIndexes.indexOf(i) === -1) });
  }

  public handleGridSort(sortColumn, sortDirection)
  {
    const comparer = (aa, bb) =>
    {
      const a = aa.fields.get(sortColumn);
      const b = bb.fields.get(sortColumn);

      if (sortDirection === 'ASC')
      {
        return (a > b) ? 1 : -1;
      }
      else if (sortDirection === 'DESC')
      {
        return (a < b) ? 1 : -1;
      }
      else
      {
        return 0;
      }
    };

    if (sortDirection === 'NONE')
    {
      this.setState({ rows: this.props.results });
    }
    else
    {
      this.setState({ rows: this.state.rows.sort(comparer) });
    }

    if (this.state.selectedIndexes.size > 0)
    {
      // todo
      this.setState({ selectedIndexes: List([]) });
    }
  }

  public handleFilterChange(filter)
  {
    if (filter.filterTerm === '')
    {
      this.clearFilters();
    }
    else
    {
      this.setState({
        rows: this.props.results.filter((r) => (r.fields.get(filter.column.key).toString().includes(filter.filterTerm)))
      });
    }
  }

  public clearFilters()
  {
    this.setState({ rows: this.props.results });
  }

  public spotlight(row: number)
  {
    const result = this.props.results && this.props.results.get(row);
    const id = result.primaryKey;
    const spotlightColor = ColorManager.altColorForKey(id);

    const spotlightData = result.toJS();
    spotlightData['name'] = getResultName(result, this.props.resultsConfig);
    spotlightData['color'] = spotlightColor;
    spotlightData['id'] = id;
    spotlightAction(id, spotlightData);
  }

  public unspotlight(row: number)
  {
    const result = this.props.results && this.props.results.get(row);
    spotlightAction(result.primaryKey, null);
  }

  public rowRenderer(props)
  {
    if (this.state.selectedIndexes.indexOf(props.idx) > -1)
    {
      const result = this.props.results && this.props.results.get(props.idx);
      const id = result.primaryKey;
      const spotlight = this.state.spotlightState.getIn(['spotlights', id])
      return (
        <div
          style={{
            backgroundColor: spotlight.color
          }}>
          <ReactDataGrid.Row {...props} />
        </div>
      );
    }

    return (
      <ReactDataGrid.Row {...props} />
    );
  }

  public render()
  {
    if (!this.state.rows)
    {
      return <InfoArea large='Loading...' />;
    }

    return (
      <Table
        onGridSort={this.handleGridSort}
        columns={this.state.columns}
        rows={this.state.rows}
        rowGetter={this.getRow}
        rowsCount={this.state.rows.size}
        random={this.state.random}
        rowRenderer={this.rowRenderer}
        rowKey={'_id' /*TODO*/}
        rowSelection={{
          showCheckbox: true,
          enableShiftSelect: true,
          onRowsSelected: this.onRowsSelected,
          onRowsDeselected: this.onRowsDeselected,
          selectBy: {
            indexes: this.state.selectedIndexes.toJS(),
          }
        }}
        toolbar={<Toolbar enableFilter={true} />}
        onAddFilter={this.handleFilterChange}
        onClearFilters={this.clearFilters}
      />
    );
  }
}
