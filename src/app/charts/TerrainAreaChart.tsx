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
import * as _ from 'lodash';
import * as React from 'react';
import ContainerDimensions from 'react-container-dimensions';
import
{
  VictoryArea,
  VictoryAxis,
  VictoryBrushContainer,
  VictoryChart,
  VictoryContainer,
  VictoryGroup,
  VictoryLabel,
  VictoryLegend,
  VictoryScatter,
  VictoryTheme,
  VictoryTooltip,
  VictoryZoomContainer,
} from 'victory';

interface Dataset
{
  id: number;
  name: string;
  data: any[];
}

interface Props
{
  datasets: List<Dataset>;
}

interface State
{
  selectedDomain: any;
  zoomDomain: any;
  visibleDatasets: List<ID>;
}

const colors = ['blue', 'red', 'green', 'yellow'];

export default class TerrainAreaChart extends React.Component<Props, State> {
  public static defaultProps = {
    datasets: [],
  };

  constructor(props)
  {
    super(props);

    const visibleDatasets = props.datasets.map((ds) => ds.id);

    this.state = {
      selectedDomain: {},
      zoomDomain: {},
      visibleDatasets: Immutable.List(visibleDatasets),
    };
  }

  public componentWillReceiveProps(nextProps)
  {
    const visibleDatasets = nextProps.datasets.map((ds) => ds.id);
    this.setState({ visibleDatasets: visibleDatasets.toList() });
  }

  public handleZoom(domain)
  {
    this.setState({ selectedDomain: domain });
  }

  public handleBrush(domain)
  {
    this.setState({ zoomDomain: domain });
  }

  public renderAreas()
  {
    const { datasets } = this.props;
    const { visibleDatasets } = this.state;
    const chartStyle = {};
    const areas = [];

    datasets.forEach((ds, index) =>
    {
      if (visibleDatasets.includes(ds.id))
      {
        areas.push(
          <VictoryArea
            key={ds.id}
            style={{ data: { fill: colors[index % colors.length] } }}
            data={ds.data}
            interpolation='monotoneX'
          />,
        );
        areas.push(
          <VictoryScatter
            key={ds.id}
            size={5}
            data={ds.data}
          />,
        );
      }
    });

    return areas;
  }

  public renderLegend()
  {
    const { datasets } = this.props;
    const { visibleDatasets } = this.state;

    const data = datasets
      .map((ds) =>
      {
        return {
          id: ds.id,
          name: ds.name,
        };
      });

    return (
      <VictoryLegend
        data={data.toArray()}
        orientation={'horizontal'}
        style={{ labels: { backgroundColor: 'red', border: '1px solid white' } }}
        events={[{
          target: 'labels',
          eventHandlers: {
            onClick: this.handleLegendClick.bind(this),
          },
        }]}
      />
    );
  }

  public handleLegendClick(e, props)
  {
    this.toggleDatasetVisibility(props.datum.id);
  }

  public toggleDatasetVisibility(datasetId)
  {
    const { visibleDatasets } = this.state;

    if (visibleDatasets.includes(datasetId))
    {
      const datasetIdIndex = visibleDatasets.indexOf(datasetId);
      this.setState({
        visibleDatasets: visibleDatasets.remove(datasetIdIndex),
      });
    } else
    {
      this.setState({
        visibleDatasets: visibleDatasets.push(datasetId),
      });
    }
  }

  public render()
  {
    const { datasets } = this.props;
    const areas = this.renderAreas();
    const legend = this.renderLegend();

    const chartsPadding = { top: 10, bottom: 25, left: 40, right: 0 };

    return (
      <div style={{ width: '100%', display: 'flex', flexFlow: 'column nowrap' }}>
        <div style={{ height: '80%' }}>
          <ContainerDimensions>
            {({ width, height }) =>
              <VictoryChart
                scale={{ x: 'linear' }}
                theme={VictoryTheme.material}
                padding={chartsPadding}
                containerComponent={
                  <VictoryZoomContainer
                    responsive={false}
                    dimension='x'
                    zoomDomain={this.state.zoomDomain}
                    onDomainChange={this.handleZoom.bind(this)}
                  />
                }
                width={width}
                height={height}
              >
                <VictoryGroup
                  style={{
                    data: { strokeWidth: 3, fillOpacity: 0.4 },
                  }}
                >
                  {areas}
                </VictoryGroup>
                {legend}
              </VictoryChart>
            }
          </ContainerDimensions>
        </div>
        <div style={{ width: '100%', height: '20%' }}>
          <ContainerDimensions>
            {({ width, height }) =>
              <VictoryChart
                padding={{ top: 10, bottom: 25, left: 40, right: 0 }}
                theme={VictoryTheme.material}
                width={width} height={height}
                containerComponent={
                  <VictoryBrushContainer responsive={false}
                    dimension='x'
                    selectedDomain={this.state.selectedDomain}
                    onDomainChange={this.handleBrush.bind(this)}
                  />
                }
              >
                <VictoryAxis />
                <VictoryArea
                  style={{ data: { fill: '#c43a31' } }}
                  data={datasets.first() !== null ? datasets.first().data : []}
                  interpolation='monotoneX'
                />
              </VictoryChart>
            }
          </ContainerDimensions>
        </div>
      </div>
    );
  }
}
