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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import Autocomplete from '../../../../common/components/Autocomplete';
import { Path, Score, ScoreLine, Source } from '../PathfinderTypes';
import ScoreBar from '../../charts/ScoreBar';
import {BuilderStore} from './../../../data/BuilderStore';
import BuilderActions from './../../../data/BuilderActions';
import TransformCard from '../../charts/TransformCard';

export interface Props
{
  line: ScoreLine;
  source: Source;
  step: string;
  canEdit: boolean;
  index: number;
  onDelete: (index) => void;
  onFieldChange: (index, field) => void;
  onWeightChange: (index, weight) => void;
  allWeights: Array<{ weight: number }>;
  keyPath: KeyPath;
}

class PathfinderSourceLine extends TerrainComponent<Props>
{
  public state: {
    field: string;
    weight: number;
    expandTransform: boolean;
  } = {
    field: this.props.line.field,
    weight: this.props.line.weight,
    expandTransform: true;
  };

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.line !== nextProps.line) 
    {
      this.setState({
        field: nextProps.line.field,
        weight: nextProps.line.weight,
      });
    }
  }

  public handleFieldChange(field)
  {
    this.setState({
      field,
    });
    this.props.onFieldChange(this.props.index, field);
  }

  public handleWeightChange(event)
  {
    this.setState({
      weight: event.target.value,
    });
    this.props.onWeightChange(this.props.index, event.target.value);
  }

  public renderTransformChart()
  {
    const data = {
      input: this.state.field,
      domain: List([0, 100]),
      hasCustomDomain: false,
      scorePoints: List([]),
      static: {
        colors: ["#1eb4fa", "rgb(60, 63, 65)"]
      }
    };

    return (<TransformCard 
          builderState={BuilderStore.getState()}
          canEdit={this.props.canEdit}
          className={'builder-comp-list-item'}
          data={data}
          handleCardDrop={undefined}
          helpOn={undefined}
          keyPath={this.props.keyPath.push('transformData')}
          language={'elastic'}
          onChange={BuilderActions.change}
          parentData={undefined}
        />);
  }

  public render()
  {
    const { source, step } = this.props;

    return (
      <div>
        <div
          className='pf-score-line'
        >
            <ScoreBar
              parentData={{weights: this.props.allWeights}}
              data={{weight: this.state.weight}}
              keyPath={this.props.keyPath.push('weight')} 
            />
            <input
              value={this.state.weight}
              onChange={this.handleWeightChange}
            />
            <span>times their</span>
            <Autocomplete
              value={this.state.field}
              onChange={this.handleFieldChange}
              options={List(['price', 'margin', 'conversion'])} // TODO getAutoOptions from PathTypes ?
              placeholder={'field'}
            />
            <span onClick={this._toggle('expandTransform')}>Score: </span>
          </div>
          {this.state.expandTransform && this.renderTransformChart()}
          <div
            onClick={this._fn(this.props.onDelete, this.props.index)}
          >
            Delete this factor
          </div>
      </div>
    );
  }
}

export default PathfinderSourceLine;
