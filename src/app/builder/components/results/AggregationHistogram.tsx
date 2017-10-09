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

// tslint:disable:no-empty restrict-plus-operands strict-boolean-expressions no-var-requires

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const Dimensions = require('react-dimensions');
const { List, Map } = Immutable;
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import { AllBackendsMap } from '../../../../database/AllBackends';
import TerrainComponent from '../../../common/components/TerrainComponent';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';

const ZOOM_FACTOR = 2.0;

import Histogram from './../../../charts/components/Histogram';

export interface Props
{
  data: any;
  colors: [string, string];
  containerWidth?: number;
}

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

class AggregationHistogram extends TerrainComponent<Props>
{
  constructor(props: Props)
  {
    super(props);
  }

  public componentDidMount()
  {
    const el = ReactDOM.findDOMNode(this);
    Histogram.create(el, this.getChartState());
  }

   public parseData(buckets)
  {
    let data;
    let domainMin: number = Infinity;
    let domainMax: number = -Infinity;
    let rangeMax: number = -Infinity;
    let categories = [];
    // RANGE QUERIES
    if (buckets[0] && (buckets[0].to || buckets[0].from))
    {
      domainMin = 0;
      domainMax = buckets.length;
      data = buckets.map((bucket, i) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        return { x: i, y: bucket.doc_count };
      });
      categories = buckets.map((bucket) =>
      {
        const to = bucket.to !== undefined ? String(bucket.to) : '';
        const from = bucket.from !== undefined ? String(bucket.from) : '';
        return from + '-' + to;
      });
    }
    // TERMS QUERIES
    else if (buckets[0] && buckets[0].key && typeof buckets[0].key === 'string')
    {
      domainMin = 0;
      domainMax = buckets.length;
      data = buckets.map((bucket, i) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        return { x: i, y: bucket.doc_count };
      });
      categories = buckets.map((bucket) =>
      {
        return bucket.key;
      });
    }
    // HISTOGRAM QUERIES
    else
    {
      data = buckets.map((bucket) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        if (bucket.key > domainMax)
        {
          domainMax = bucket.key;
        }
        if (bucket.key < domainMin)
        {
          domainMin = bucket.key;
        }
        return { x: bucket.key, y: bucket.doc_count };
      });
    }
    return { barsData: data, categories, domain: List([domainMin, domainMax]), range: List([0, rangeMax]) };
  }

  public getChartState(overrideState?: any)
  {
    overrideState = overrideState || {};
    const buckets = overrideState.data || this.props.data;
    const { barsData, categories, domain, range } = this.parseData(buckets);

    const chartState = {
      barsData: (barsData),
      domain: {
        x: domain.toJS(),
        y: range.toJS(),
      },
      width: overrideState.containerWidth || this.props.containerWidth || 300,
      height: 300,
      colors: this.props.colors,
      xLabels: categories,
    };

    return chartState;
  }

  public componentWillUnmount()
  {
    const el = ReactDOM.findDOMNode(this);
    Histogram.destroy(el);
  }

  public componentWillReceiveProps(nextProps)
  {
    const el = ReactDOM.findDOMNode(this);
    Histogram.update(el, this.getChartState(nextProps));
  }

  public render()
  {
    return (
      <div />
    );
  }
}
export default Dimensions({
  elementResize: true,
  containerStyle: {
    height: 'auto',
  },
})(AggregationHistogram);
