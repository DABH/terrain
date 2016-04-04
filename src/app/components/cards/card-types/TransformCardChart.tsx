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

import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Actions from "../../../data/Actions.tsx";
import Util from '../../../util/Util.tsx';
import { CardModels } from './../../../models/CardModels.tsx';

import TransformChart from '../../../charts/TransformChart.tsx';

interface Props {
  card: CardModels.ITransformCard;
  pointsData: any;
  barsData: any;
  domain: any;
  barColor: string;
  lineColor: string;
  spotlights: any[];
  inputKey: string;
}

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

class TransformCardChart extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    this.onPointMove = this.onPointMove.bind(this);
    Util.bind(this, ['onPointMove', 'dispatchAction', 'onLineClick', 'onLineMove', 'onSelect',
      'onDelete', 'onCreate']);
    // Util.throttle(this, ['dispatchAction'], 500);
    this.dispatchAction = _.debounce(this.dispatchAction, 500);
    
    this.state = {
      width: -1,
      domain: Util.deeperCloneObj(props.domain),
      pointsData: Util.deeperCloneArr(props.pointsData),
      barsData: Util.deeperCloneArr(props.barsData),
      barColor: props.barColor,
      lineColor: props.lineColor,
      spotlights: props.spotlights,
      inputKey: props.inputKey,
      selectedPointIds: [],
    }
  }
  
  componentDidMount() 
  {
    var el = ReactDOM.findDOMNode(this);
    TransformChart.create(el, {
      width: '100%',
      height: '300px',
    }, this.getChartState());
  }
  
  componentWillReceiveProps(newProps)
  {
    var changed = false;
    var newDomain = this.state.domain;
    var newPointsData = this.state.pointsData;
    var newBarsData = this.state.barsData;
    var newWidth = this.state.width;
    var newBarColor = this.state.barColor;
    var newLineColor = this.state.lineColor;
    var newSpotlights = this.state.spotlights;
    var newInputKey = this.state.inputKey;
    
    if(ReactDOM.findDOMNode(this).getBoundingClientRect().width !== this.state.width)
    {
      changed = true;
      newWidth = ReactDOM.findDOMNode(this).getBoundingClientRect().width;
    }
    
    if(!_.isEqual(newProps.domain, this.state.domain))
    {
      changed = true;
      newDomain = Util.deeperCloneObj(newProps.domain);
    }
    
    if(!_.isEqual(newProps.pointsData, this.state.pointsData))
    {
      changed = true;
      newPointsData = Util.deeperCloneArr(newProps.pointsData);
    }
    
    if(!_.isEqual(newProps.barsData, this.state.barsData))
    {
      changed = true;
      newBarsData = Util.deeperCloneArr(newProps.barsData);
    }
    
    if(!_.isEqual(newProps.spotlights, this.state.spotlights))
    {
      changed = true;
      newSpotlights = Util.deeperCloneArr(newProps.spotlights);
    }
    
    if(newProps.inputKey !== this.state.inputKey)
    {
      changed = true;
      newInputKey = newProps.inputKey;
    }
    
    if(this.state.barColor !== newProps.barColor)
    {
      changed = true;
      newBarColor = newProps.barColor;
    }
    
    if(this.state.lineColor !== newProps.lineColor)
    {
      changed = true;
      newLineColor = newProps.lineColor;
    }
    
    if(changed)
    {
      this.setState({
        domain: newDomain,
        pointsData: newPointsData,
        barsData: newBarsData,
        width: newWidth,
        barColor: newBarColor,
        lineColor: newLineColor,
        spotlights: newSpotlights,
        inputKey: newInputKey,
      });
      
      var el = ReactDOM.findDOMNode(this);
      TransformChart.update(el, this.getChartState({
        domain: newDomain,
        pointsData: newPointsData,
        barsData: newBarsData,
        width: newWidth,
        barColor: newBarColor,
        lineColor: newLineColor,
        spotlights: newSpotlights,
        inputKey: newInputKey,
      }));
    }
    
  }
  
  onSelect(pointId)
  {
    if(!pointId)
    {
      // things got unselected
      this.setState({
        selectedPointIds: [],
      });
    }
    else
    {
      this.setState({
        selectedPointIds: this.state.selectedPointIds.concat([pointId])
      })
    }
    
    TransformChart.update(ReactDOM.findDOMNode(this), this.getChartState());
  }
  
  dispatchAction(arr)
  {
    if(arr[0] === true)
    {
      // only changing one score point
      var scorePointId = arr[1];
      var newScore = arr[2];
      var value = this.props.card.scorePoints.find(scorePoint => scorePoint.id === scorePointId).value;
      Actions.cards.transform.scorePoint(this.props.card, 
      {
        id: scorePointId,
        score: newScore,
        value,
      });
    } 
    else
    {
      console.log('do scorepoints');
      Actions.cards.transform.scorePoints(this.props.card, arr);
      console.log('end scorepoints');
    }
  }
  
  onPointMove(scorePointId, newScore)
  {
    newScore = Util.valueMinMax(newScore, 0, 1);
    var pointIndex = this.props.pointsData.findIndex(scorePoint => scorePoint.id === scorePointId);
    var scoreDiff = newScore - this.props.pointsData[pointIndex].score;
    
    var newPointsData = Util.deeperCloneArr(this.props.pointsData).map(scorePoint => {
      if(scorePoint.id === scorePointId || this.state.selectedPointIds.find(id => id === scorePoint.id))
      {
        scorePoint.score = Util.valueMinMax(scorePoint.score + scoreDiff, 0, 1);
      }
      return scorePoint;
    });
    
    var el = ReactDOM.findDOMNode(this);
    TransformChart.update(el, this.getChartState({
      pointsData: newPointsData,
    }));
    
    this.dispatchAction(newPointsData);
  }
  
  onLineClick(x, y)
  {
    this.setState({
      lineMoving: true,
      initialLineY: y,
    })
  }
  
  onLineMove(x, y)
  {
    var scoreDiff = y - this.state.initialLineY;
    var newPointsData = Util.deeperCloneArr(this.props.pointsData).map(point => {
      point.score = Util.valueMinMax(point.score + scoreDiff, 0, 1);
      return point;
    });
    this.dispatchAction(newPointsData);

    var el = ReactDOM.findDOMNode(this);
    TransformChart.update(el, this.getChartState({
      pointsData: newPointsData,
    }));
  }
  
  onDelete(pointId)
  {
    console.log('delete start');
    var newPointsData = this.props.pointsData.reduce((pointsData, point) => {
      if(point.id !== pointId && ! this.state.selectedPointIds.find(id => id === point.id))
      {
        pointsData.push(point);
      }
      return pointsData;
    }, []);
    
    TransformChart.update(ReactDOM.findDOMNode(this), this.getChartState({
      pointsData: newPointsData,
    }));
    
    this.dispatchAction(newPointsData);
    console.log('delete end');
  }
  
  onCreate(x, y)
  {
    console.log(x,y);
  }
  
  getChartState(overrideState?: any) {
    overrideState = overrideState || {};
    
    var pointsData = (overrideState.pointsData || this.props.pointsData).map((scorePoint) => ({
      x: scorePoint.value,
      y: scorePoint.score,
      id: scorePoint.id,
      selected: !! this.state.selectedPointIds.find(id => id === scorePoint.id),
    }));
    
    var chartState = {
      barsData: overrideState.barsData || this.props.barsData,
      pointsData: pointsData,
      domain: overrideState.domain || this.props.domain,
      onMove: this.onPointMove,
      onLineClick: this.onLineClick,
      onLineMove: this.onLineMove,
      colors: {
        bar: overrideState.barColor || this.props.barColor,
        line: overrideState.lineColor || this.props.lineColor,
      },
      spotlights: overrideState.spotlights || this.props.spotlights,
      inputKey: overrideState.inputKey || this.props.inputKey,
      onSelect: this.onSelect,
      onDelete: this.onDelete,
      onCreate: this.onCreate,
    };
    
    return chartState;
  }
  
  componentWillUnmount() {
    var el = ReactDOM.findDOMNode(this);
    TransformChart.destroy(el);
  }

	render() {
    return (
      <div></div>
		);
	}
};

export default TransformCardChart;