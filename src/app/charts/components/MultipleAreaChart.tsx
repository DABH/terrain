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
import ContainerDimensions from 'react-container-dimensions';
import
{
  createContainer,
  VictoryArea,
  VictoryAxis,
  VictoryBrushContainer,
  VictoryChart,
  VictoryGroup,
  VictoryLegend,
  VictoryScatter,
  VictoryTheme,
  VictoryTooltip,
} from 'victory';
import TerrainComponent from './../../common/components/TerrainComponent';
import * as LibraryTypes from './../../library/LibraryTypes';

const styles = {
  wrapper: {
    width: '100%',
    display: 'flex',
    flexFlow: 'column nowrap',
  },
  topChartWrapper: {
    height: '80%',
  },
  bottomChartWrapper: {
    width: '100%',
    height: '20%',
  },
  topChart: {
    padding: { top: 10, bottom: 25, left: 40, right: 0 },
    areas: { data: { strokeWidth: 2, fillOpacity: 0.4 } },
    tooltip: { fill: 'white' },
  },
  bottomChart: {
    padding: { top: 10, bottom: 25, left: 40, right: 0 },
    areas: { data: { fill: '#c43a31' } },
  },
};

const config = {
  topChart: {
    scale: { x: 'time', y: 'linear' },
    interpolation: 'monotoneX',
    animate: { duration: 500 },
  },
  bottomChart: {
    scale: { x: 'time' },
    interpolation: 'monotoneX',
  },
  legend: {
    orientation: 'horizontal',
  },
};

interface Dataset
{
  id: ID;
  label: string[];
  data: any[];
}

interface Props
{
  datasets: Immutable.Map<ID, Dataset>;
  xDataKey: string; // The key to get the value of x from the data
  yDataKey: string; // The key to get the value of y from the data
}

interface State
{
  selectedDomain: any;
  zoomDomain: any;
  visibleDatasets: List<ID>;
  highlightDataset: ID;
  datasetColors: any;
}

const colors = ['blue', 'red', 'green', 'yellow'];

export default class MultipleAreaChart extends TerrainComponent<Props> {
  public static defaultProps = {
    datasets: [],
    xDataKey: 'x',
    yDataKey: 'y',
  };

  public state: State = {
    selectedDomain: {},
    zoomDomain: {},
    visibleDatasets: null,
    highlightDataset: null,
    datasetColors: {},
  };

  constructor(props)
  {
    super(props);

    const { datasets } = props;

    this.state.visibleDatasets = datasets.keySeq().toList();
    this.state.datasetColors = this.mapDatasetColors(datasets);
  }

  public mapDatasetColors(datasets)
  {
    const datasetColors = {};

    datasets.keySeq().forEach((datasetId, index) =>
    {
      datasetColors[datasetId] = colors[index % colors.length];
    });

    return datasetColors;
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.datasets !== nextProps.datasets)
    {
      const visibleDatasets = nextProps.datasets.keySeq();
      this.setState({
        visibleDatasets: visibleDatasets.toList(),
        datasetColors: this.mapDatasetColors(nextProps.datasets),
      });
    }
  }

  public handleZoom(domain)
  {
    this.setState({ selectedDomain: domain });
  }

  public handleBrush(domain)
  {
    this.setState({ zoomDomain: domain });
  }

  public renderData()
  {
    const { datasets, xDataKey, yDataKey } = this.props;
    const { visibleDatasets, highlightDataset } = this.state;
    const areas = [];
    const scatters = [];

    let areaToHightlight = null;
    let scatterToHightlight = null;

    datasets.forEach((ds, key) =>
    {
      if (visibleDatasets.includes(key))
      {
        if (key !== highlightDataset || highlightDataset === null)
        {
          areas.push(
            <VictoryArea
              key={key}
              name={`area-${key}`}
              style={{ data: { fill: this.getDatasetColor(key) } }}
              data={ds.data}
              interpolation={config.topChart.interpolation}
              x={xDataKey}
              y={yDataKey}
            />,
          );
          scatters.push(
            <VictoryScatter
              key={key}
              data={ds.data}
              size={0}
              x={xDataKey}
              y={yDataKey}
            />,
          );
        }
        else
        {
          areaToHightlight = (
            <VictoryArea
              name={`area-${key}`}
              key={key}
              style={{ data: { fill: this.getDatasetColor(key) } }}
              data={ds.data}
              interpolation={config.topChart.interpolation}
              x={xDataKey}
              y={yDataKey}
            />
          );

          scatterToHightlight = (
            <VictoryScatter
              key={key}
              size={(datum, active) => active ? 5 : 0}
              data={ds.data}
              x={xDataKey}
              y={yDataKey}
            />
          );
        }
      }
    });

    if (areaToHightlight !== null)
    {
      areas.push(areaToHightlight);
    }

    if (scatterToHightlight !== null)
    {
      scatters.push(scatterToHightlight);
    }

    return { areas, scatters };
  }

  public renderLegend()
  {
    const { datasets } = this.props;
    const { visibleDatasets } = this.state;

    const data = datasets
      .map((ds, key) =>
      {
        let labelsStyle = {};

        if (visibleDatasets.includes(key))
        {
          labelsStyle = { textDecoration: 'underline' };
        }

        return {
          id: ds.id,
          name: ds.label,
          labels: labelsStyle,
        };
      });

    return (
      <VictoryLegend
        name='legend'
        data={data.toArray()}
        orientation={config.legend.orientation}
      />
    );
  }

  public getDatasetColor(datasetId)
  {
    return this.state.datasetColors[datasetId];
  }

  public handleLegendClick(e, props)
  {
    this.toggleDatasetVisibility(props.datum.id);
  }

  public handleLegendMouseOver(e, props)
  {
    /* Return an array of affected victory components.
     * @childName: is optional, can be used to reference any victory component
     *   within the same VictoryChart by its name property. Then, the props
     *   received by the mutation function will be the ones of the referenced
     *   component, and the props returned by the mutation will be applied to
     *   it.
     * @target: {'data' | 'labels'} indicates what's the component to which
     *   the new props returned by the mutation will be applied. For instance,
     *   if this event comes from a VictoryLegend, 'data' refers to the legend
     *   item marker (the dot in this case) and 'labels' means the legend item
     *   text.
     * @mutation: is a function, recieves the props of the matched element, and
     *   returns a new props objects to be applied to it.
     */
    return [
      {
        // Matches the VictoryLegend texts.
        target: 'labels',
        mutation: (labelProps) =>
        {
          // Changes the VictoryLegend hover item text font size.
          const newStyle = Object.assign({}, labelProps.style, { fontSize: 16 });
          return { style: newStyle };
        },
      },
      {
        // Matches the VictoryArea that corresponds with the hovered legend item.
        childName: `area-${props.datum.id}`,
        target: 'data', // in this case 'data' means the area (the 'labels' are
        // the tooltips)
        eventKey: 'all', // this holds the index of single data points,
        // we want to paint the whole area
        mutation: (areaProps) =>
        {
          // Store a reference to the active dataset, to bring it to the front
          this.setState({ highlightDataset: props.datum.id });
          return {
            // Change the corresponding area style.
            style: Object.assign(
              {},
              areaProps.style,
              { fill: this.getDatasetColor(props.datum.id), strokeWidth: 3, fillOpacity: 0.7 },
            ),
          };
        },
      },
    ];
  }

  public handleLegendMouseOut(e, props)
  {
    return [
      {
        target: 'labels',
        mutation: () => null,
      },
      {
        childName: [`area-${props.datum.id}`],
        target: 'data',
        eventKey: 'all',
        mutation: () =>
        {
          // Returning null resets all mutations, reverts the component back to
          // its original state.
          return null;
        },
      },
    ];
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
    const { datasets, xDataKey, yDataKey } = this.props;
    const data = this.renderData();
    const legend = this.renderLegend();

    const VictoryZoomVoronoiContainer = createContainer('zoom', 'voronoi');

    return (
      <div style={styles.wrapper}>
        <div style={styles.topChartWrapper}>
          <ContainerDimensions>
            <VictoryChart
              scale={config.topChart.scale}
              theme={VictoryTheme.material}
              padding={styles.topChart.padding}
              containerComponent={
                <VictoryZoomVoronoiContainer
                  responsive={false}
                  dimension='x'
                  zoomDomain={this.state.zoomDomain}
                  onDomainChange={this.handleZoom}
                  labels={(d) => d.l ? `${d.x} => ${d.y}` : null}
                  labelComponent={
                    <VictoryTooltip cornerRadius={0} flyoutStyle={styles.topChart.tooltip} />
                  }
                />
              }
              events={[{
                // indicate, by name, the component that listens to the event
                childName: ['legend'],
                // { 'data', 'labels' }, indicates if the texts or the dots
                // of the legend items are the one that listens to the event.
                target: 'labels',
                eventHandlers: {
                  onClick: this.handleLegendClick,
                  onMouseOver: this.handleLegendMouseOver,
                  onMouseOut: this.handleLegendMouseOut,
                },
              }]}
            >
              <VictoryGroup
                style={styles.topChart.areas}
              >
                {data.areas}
                {data.scatters}
              </VictoryGroup>
              {legend}
            </VictoryChart>
          </ContainerDimensions>
        </div>
        <div style={styles.bottomChartWrapper}>
          <ContainerDimensions>
            <VictoryChart
              scale={config.bottomChart.scale}
              padding={styles.bottomChart.padding}
              theme={VictoryTheme.material}
              containerComponent={
                <VictoryBrushContainer responsive={false}
                  dimension='x'
                  selectedDomain={this.state.selectedDomain}
                  onDomainChange={this.handleBrush}
                />
              }
            >
              <VictoryAxis />
              <VictoryArea
                style={styles.bottomChart.areas}
                data={datasets.first() !== null ? datasets.first().data : []}
                interpolation={config.bottomChart.interpolation}
                x={xDataKey}
                y={yDataKey}
              />
            </VictoryChart>
          </ContainerDimensions>
        </div>
      </div>
    );
  }
}
