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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-unused-expression

import { List } from 'immutable';
import * as React from 'react';
import * as Dimensions from 'react-dimensions';

import * as BlockUtils from '../../../../blocks/BlockUtils';
import Block from '../../../../blocks/types/Block';
import { Card, CardString } from '../../../../blocks/types/Card';

import { Ajax, AjaxResponse } from '../../../util/Ajax';
import AjaxM1 from '../../../util/AjaxM1';
import * as SpotlightTypes from '../../data/SpotlightTypes';
import TerrainComponent from './../../../common/components/TerrainComponent';
import TransformCardChart from './TransformCardChart';
import TransformCardPeriscope from './TransformCardPeriscope';

import { BuilderState } from 'app/builder/data/BuilderState';
import Util from 'app/util/Util';
import PathfinderText from 'builder/components/pathfinder/PathfinderText';
import FadeInOut from 'common/components/FadeInOut';
import Switch from 'common/components/Switch';
import { TransformQueryUtil } from 'util/TransformQueryUtil';
import { ElasticQueryResult } from '../../../../../shared/database/elastic/ElasticQueryResponse';
import ESInterpreter from '../../../../../shared/database/elastic/parser/ESInterpreter';
import { ESJSParser } from '../../../../../shared/database/elastic/parser/ESJSParser';
import { MidwayError } from '../../../../../shared/error/MidwayError';
import { toInputMap } from '../../../../blocks/types/Input';
import { isInput } from '../../../../blocks/types/Input';
import { getIndex, getType } from '../../../../database/elastic/blocks/ElasticBlockHelpers';
import { stringifyWithParameters } from '../../../../database/elastic/conversion/ParseElasticQuery';
import MidwayQueryResponse from '../../../../database/types/MidwayQueryResponse';
import { M1QueryResponse } from '../../../util/AjaxM1';
import MapUtil from 'util/MapUtil';

const NUM_BARS = 1000;

export interface Props
{
  keyPath: KeyPath;
  data: any; // transform card
  onChange: (keyPath: KeyPath, value: any, isDirty?: boolean) => void;
  language: string;

  canEdit?: boolean;
  // spotlights?: any;
  spotlights?: SpotlightTypes.SpotlightState;
  containerWidth?: number;
  index?: string;

  builder?: BuilderState;
}

export interface Bar
{
  id: string;
  count: number;
  percentage: number; // of max
  range:
  {
    min: number;
    max: number;
  };
}
export type Bars = List<Bar>;

class TransformCard extends TerrainComponent<Props>
{
  public state: {
    // the domain of the chart and the periscope, updated by the periscope domain change and zoom in/out from the chart
    chartDomain: List<number>;
    // the maximum domain, updated by the two input fields.
    maxDomain: List<number>;
    range: List<number>;
    bars: Bars;
    queryXhr?: AjaxResponse;
    queryId?: string;
    error?: boolean;
    builderState?: any;
  };

  constructor(props: Props)
  {
    super(props);
    this.state = {
      // props.data.domain is List<string>
      maxDomain: List([Number(props.data.domain.get(0)), Number(props.data.domain.get(1))]),
      chartDomain: List([Number(props.data.domain.get(0)), Number(props.data.domain.get(1))]),
      range: List([0, 1]),
      bars: List([]),
    };
  }

  public componentDidMount()
  {
    // Only want to calculate this the first time that we open the chart
    if (this.state.bars.size === 0)
    {
      this.computeBars(this.props.data, this.state.maxDomain, !this.props.data.hasCustomDomain);
    }
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if ((nextProps.builder.query.tql !== this.props.builder.query.tql ||
      nextProps.builder.query.inputs !== this.props.builder.query.inputs)
      && !this.props.data.closed && nextProps.data.input === '_score')
    {
      this.computeBars(nextProps.data, this.state.maxDomain, true, nextProps.builder.query);
    }
    // nextProps.data.domain is list<string>
    const newDomain: List<number> = List([Number(nextProps.data.domain.get(0)), Number(nextProps.data.domain.get(1))]);
    if (!newDomain.equals(this.state.maxDomain))
    {
      const trimmedDomain = this.trimDomain(this.state.maxDomain, newDomain);
      if (trimmedDomain !== this.state.maxDomain)
      {
        this.setState({
          maxDomain: trimmedDomain,
          chartDomain: trimmedDomain,
        });
        this.computeBars(nextProps.data, trimmedDomain);
        return;
      }
    }
    if (nextProps.data.input !== this.props.data.input ||
      nextProps.data.distanceValue !== this.props.data.distanceValue ||
      (
        nextProps.builder.query.inputs !== this.props.builder.query.inputs &&
        nextProps.data.distanceValue && nextProps.data.distanceValue.address &&
        nextProps.data.distanceValue.address.charAt(0) === '@'
      ))
    {
      this.computeBars(nextProps.data, this.state.maxDomain, true);
    }
  }

  public componentWillUnmount()
  {
    this.state.queryXhr && this.state.queryXhr.cancel(); // M1 mysql
    this.killXHR('domainAggregationAjax');
    this.killXHR('aggregationAjax');
    this.killQuery();
  }

  public killXHR(stateKey)
  {
    this.state[stateKey] && this.state[stateKey].xhr &&
      this.state[stateKey].xhr.cancel();
  }

  public killQuery()
  {
    if (this.props.language === 'mysql')
    {
      this && this.state && this.state.queryId &&
        AjaxM1.killQuery(this.state.queryId);
    }
  }

  // M1 (mysql)
  public handleQueryError(error: any)
  {
    this.setState({
      bars: List([]),
      error: true,
      queryXhr: null,
      queryId: null,
    });
  }

  public handleChartDomainChange(chartDomain: List<number>)
  {
    this.setState({
      chartDomain,
    });
  }

  // called by TransformCardChart to zoom on a specific part of the domain
  public handleRequestDomainChange(domain: List<number>, overrideMaxDomain = false)
  {
    const trimmedDomain = this.trimDomain(this.state.chartDomain, domain);

    let low = trimmedDomain.get(0);
    let high = trimmedDomain.get(1);

    if (!overrideMaxDomain)
    {
      low = Math.max(low, this.state.maxDomain.get(0));
      high = Math.min(high, this.state.maxDomain.get(1));
    }

    if (low !== this.state.chartDomain.get(0) || high !== this.state.chartDomain.get(1))
    {
      const newDomain = List([low, high]);
      this.setState({
        chartDomain: newDomain,
      });
      if (overrideMaxDomain)
      {
        this.setState({
          maxDomain: newDomain,
        });
        this.props.onChange(this._ikeyPath(this.props.keyPath, 'domain'), newDomain, true);
      }
    }
  }

  // called by TransformCardChart to request that the view be zoomed to fit the data
  public handleZoomToData()
  {
    this.computeBars(this.props.data, this.state.maxDomain, true);
  }

  public handleUpdatePoints(points, isConcrete?: boolean)
  {
    this.props.onChange(this._ikeyPath(this.props.keyPath, 'visiblePoints'), points, true);
    this.props.onChange(this._ikeyPath(this.props.keyPath, 'scorePoints'), points, !isConcrete);
    // we pass !isConcrete as the value for "isDirty" in order to tell the Store when to
    //  set an Undo checkpoint. Moving the same point in the same movement should not result
    //  in more than one state on the Undo stack.
  }

  public render()
  {
    const spotlights = this.props.spotlights.spotlights;
    const { data } = this.props;
    const width = this.props.containerWidth ? this.props.containerWidth + 55 : 300;
    const points = data.visiblePoints && data.visiblePoints.size ? data.visiblePoints : data.scorePoints;
    return (
      <div
        className='transform-card-inner'
      >
        <TransformCardChart
          onRequestDomainChange={this.handleRequestDomainChange}
          onRequestZoomToData={this.handleZoomToData}
          canEdit={this.props.canEdit}
          points={points}
          bars={this.state.bars}
          domain={this.state.chartDomain}
          range={this.state.range}
          keyPath={this.props.keyPath}
          spotlights={spotlights && spotlights.toList().toJS()}
          inputKey={BlockUtils.transformAlias(this.props.data)}
          updatePoints={this.handleUpdatePoints}
          width={width}
          language={this.props.language}
          colors={this.props.data.static.colors}
          mode={this.props.data.mode}
          builder={this.props.builder}
          index={this.props.index || getIndex('', this.props.builder)}
          distanceValue={data.distanceValue}
        />
        <TransformCardPeriscope
          onChange={this.props.onChange}
          onDomainChange={this.handleChartDomainChange}
          barsData={this.state.bars}
          domain={this.state.chartDomain}
          range={this.state.range}
          maxDomain={this.state.maxDomain}
          inputKey={BlockUtils.transformAlias(this.props.data)}
          keyPath={this.props.keyPath}
          canEdit={this.props.canEdit}
          width={width}
          language={this.props.language}
          colors={this.props.data.static.colors}
        />
        <FadeInOut
          open={this.canAutoBound()}
        >
          <div className='flex-container-left transform-card-options'>
            <Switch
              first={'Auto-Bound'}
              second={'Fixed'}
              selected={data.autoBound ? 1 : 0}
              onChange={this.handleAutoBoundChange}
              darker={true}
              longer={true}
            />
            <div className='small-font'>
              {
                data.autoBound ? PathfinderText.autoBoundOn : PathfinderText.autoBoundOff
              }
            </div>
          </div>
        </FadeInOut>
      </div>
    );
  }

  private trimDomain(curStateDomain: List<number>, maxDomain: List<number>): List<number>
  {
    const low = maxDomain.get(0);
    const high = maxDomain.get(1);
    if (Number.isNaN(low) || Number.isNaN(high) || low >= high)
    {
      // TODO: show an error message about the wrong domain values.
      return curStateDomain;
    }
    // const diff = (high - low) * 0.05;
    // low -= diff;
    // high += diff;
    return List([low, high]);
  }

  private handleElasticAggregationError(err: MidwayError | string)
  {
    this.setState({
      bars: List([]),
      error: true,
      aggregationAjax: {
        xhr: null,
        queryId: null,
      },
    });
  }

  private handleElasticAggregationResponse(resp: MidwayQueryResponse)
  {
    this.setState({
      aggregationAjax: {
        xhr: null,
        queryId: null,
      },
    });

    const min = this.state.maxDomain.get(0);
    const max = this.state.maxDomain.get(1);
    const elasticHistogram = (resp.result as ElasticQueryResult).aggregations;
    if (!elasticHistogram)
    {
      return;
    }
    const hits = (resp.result as ElasticQueryResult).hits;
    let totalDoc = 0;
    if (hits && hits.total)
    {
      totalDoc = hits.total;
    }
    let theHist;
    // Check if buckets is array (normal histogram agg) or object (from geo_distance agg)
    if (typeof elasticHistogram.transformCard.buckets === 'object' &&
      !Array.isArray(elasticHistogram.transformCard.buckets)
    )
    {
      const keys = Object.keys(elasticHistogram.transformCard.buckets);
      if (!keys.length)
      {
        return this.handleElasticAggregationError('No Result');
      }
      const bars: Bar[] = [];
      const { buckets } = elasticHistogram.transformCard;
      keys.forEach((key, i) =>
      {
        const numKey =
          bars.push({
            id: '' + i,
            count: buckets[key].doc_count,
            percentage: totalDoc ? buckets[key].doc_count / totalDoc : 0,
            range: {
              min: parseFloat(key),
              max: keys[i + 1] !== undefined ? parseFloat(keys[i + 1]) :
                parseFloat(keys[i]) + parseFloat(keys[i]) - parseFloat(keys[i - 1]),
            },
          });
      });
      this.setState({
        bars: List(bars),
      });
    }
    else
    {
      if (elasticHistogram.transformCard.buckets.length >= NUM_BARS)
      {
        theHist = elasticHistogram.transformCard.buckets;
      } else
      {
        return this.handleElasticAggregationError('No Result');
      }
      const bars: Bar[] = [];
      for (let j = 0; j < NUM_BARS; j++)
      {
        bars.push({
          id: '' + j,
          count: theHist[j].doc_count,
          percentage: totalDoc ? (theHist[j].doc_count / totalDoc) : 0,
          range: {
            min: theHist[j].key,
            max: theHist[j + 1] !== undefined ? theHist[j + 1].key : theHist[j] + (theHist[j] - theHist[j - 1]),
          },
        });
      }
      this.setState({
        bars: List(bars),
      });
    }
  }

  private handleElasticDomainAggregationError(err: MidwayError | string)
  {
    this.setState({
      error: true,
      domainAggregationAjax: {
        xhr: null,
        queryId: null,
      },
    });
  }

  // Given a groupjoined query, generate aggreagtions for min, max, and bars manually
  private handleParentGeoResponse(resp: MidwayQueryResponse)
  {
    if (resp.result && resp.result.hits && resp.result.hits.hits && resp.result.hits.hits.length)
    {
      let min;
      let max;
      const distances = [];
      console.log('resp ', resp);
      // Look at all the parents
      resp.result.hits.hits.forEach((hit, i) =>
       {
         // If they have a child query field, look through all their children
         if (hit.childQuery && hit.childQuery.length)
         {
            const parentField = Object.keys(hit._source)[0];
            const childField = Object.keys(hit.childQuery[0]._source)[0];
            hit.childQuery.forEach((child, j) =>
            {
             // Find distance between child and parent
              const distance = MapUtil.distance(
                [hit._source[parentField].lat, hit._source[parentField].lon],
                [child._source[childField].lat, child._source[childField].lon]
               );
              console.log('distance is ', distance);
              if (min === undefined || distance < min)
              {
                min = distance;
              }
              if (max === undefined || distance > max)
              {
                max = distance;
              }
              distances.push(distance);
            });
          }
        });
      // let bars = [];
      // keys.forEach((key, i) =>
      // {
      //   const numKey =
      //     bars.push({
      //       id: '' + i,
      //       count: buckets[key].doc_count,
      //       percentage: totalDoc ? buckets[key].doc_count / totalDoc : 0,
      //       range: {
      //         min: parseFloat(key),
      //         max: keys[i + 1] !== undefined ? parseFloat(keys[i + 1]) :
      //           parseFloat(keys[i]) + parseFloat(keys[i]) - parseFloat(keys[i - 1]),
      //       },
      //     });
      // });
      // this.setState({
      //   bars: List(bars),
      // });
    }
  }
  private handleElasticDomainAggregationResponse(resp: MidwayQueryResponse)
  {
    const { data, keyPath } = this.props;
    this.setState({
      domainAggregationAjax: {
        xhr: null,
        queryId: null,
      },
    });
    const agg = (resp.result as ElasticQueryResult).aggregations;
    if (agg === undefined || agg['minimum'] === undefined || agg['maximum'] === undefined)
    {
      this.handleParentGeoResponse(resp);
      return;
    }
    const newDomain = this.trimDomain(this.state.maxDomain, List([agg['minimum'].value, agg['maximum'].value]));
    this.setState({
      chartDomain: newDomain,
      maxDomain: newDomain,
    });

    if (data.autoBound && this.canAutoBound())
    {
      // adjust to new bounds
      const max = newDomain.get(1);
      const min = newDomain.get(0);
      const oldMax = data.dataDomain.get(1);
      const oldMin = data.dataDomain.get(0);

      if (max - min > 0 && oldMax - oldMin > 0) // prevent divide-by-zero
      {
        const ratio = (max - min) / (oldMax - oldMin);
        const offset = min - oldMin; // correct for nonzero mins

        if (
          !isNaN(ratio) && !isNaN(offset) && isFinite(ratio) &&
          (ratio !== 1 || offset !== 0) // no point
        )
        {
          const points = data.scorePoints.map(
            (point) => point.set('value', (point.value - oldMin) * ratio + min),
          ).toList();

          this.handleUpdatePoints(points, true);
        }
      }
    }

    this.props.onChange(this._ikeyPath(keyPath, 'domain'), newDomain, true);
    this.props.onChange(this._ikeyPath(keyPath, 'dataDomain'), newDomain, true);
    this.computeBars(data, this.state.maxDomain);
  }

  // TODO move the bars computation to a higher level
  private computeBars(data: any, maxDomain: List<number>, recomputeDomain = false, overrideQuery?)
  {
    switch (this.props.language)
    {
      case 'mysql':
        this.computeTQLBars(data.input);
        break;
      case 'elastic':
        this.computeElasticBars(data, maxDomain, recomputeDomain, overrideQuery);
        break;
      default:
        break;
    }
  }

  private computeElasticBars(data: any, maxDomain: List<number>, recomputeDomain: boolean, overrideQuery?)
  {
    const { builder } = this.props;
    const { db } = builder;
    const { input, distanceValue } = data;
    if (!input)
    {
      return;
    }
    // When using pathfinder, index will be passed in, and there is no type
    let index: string | List<string> = '';
    let type: string | List<string> = '';
    if (this.props.index !== undefined)
    {
      index = this.props.index;
    }
    else
    {
      index = getIndex('', builder);
      type = getType('', builder);
    }

    if (recomputeDomain)
    {
      let domainQuery = null;
      if (input === '_score')
      {
        domainQuery = TransformQueryUtil.getScoreDomainAggregation(overrideQuery || this.props.builder.query);
      }
      else if (distanceValue)
      {
        domainQuery = TransformQueryUtil.getGeoDomainAggregation(
          index, type, input, distanceValue, overrideQuery || builder.query,
        );
      }
      else
      {
        domainQuery = TransformQueryUtil.getDomainAggregation(index, type, input);
      }
      if (domainQuery === null)
      {
        return;
      }
      const domainAggregationAjax = Ajax.query(
        domainQuery,
        db,
        (resp) =>
        {
          this.handleElasticDomainAggregationResponse(resp);
        },
        (err) =>
        {
          this.handleElasticDomainAggregationError(err);
        },
      );
      this.setState({
        domainAggregationAjax,
      });
    }
    else
    {
      let aggQuery = null;
      const min = maxDomain.get(0);
      const max = maxDomain.get(1);
      const interval = (max - min) / NUM_BARS;
      if (input === '_score')
      {
        aggQuery = TransformQueryUtil.getScoreHistogramAggregation(overrideQuery || this.props.builder.query, min, max, interval);
      }
      else if (distanceValue)
      {
        aggQuery = TransformQueryUtil.getGeoHistogramAggregation(
          index, type, input, min, max, interval, distanceValue, overrideQuery ? overrideQuery.inputs : this.props.builder.query.inputs,
        );
      }
      else
      {
        aggQuery = TransformQueryUtil.getHistogramAggregation(index, type, input, min, max, interval);
      }
      if (aggQuery === null)
      {
        return;
      }
      const aggregationAjax = Ajax.query(
        aggQuery,
        db,
        (resp) =>
        {
          this.handleElasticAggregationResponse(resp);
        },
        (err) =>
        {
          this.handleElasticAggregationError(err);
        });
      this.setState({
        aggregationAjax,
      });
    }
  }

  private handleM1TQLQueryResponse(response: M1QueryResponse)
  {
    this.setState({
      queryXhr: null,
      queryId: null,
    });

    const results = response.results;
    if (results && results.length)
    {
      let max = +results[0].value;
      let min = +results[0].value;
      results.map((v) =>
      {
        const val = +v.value;
        if (val > max)
        {
          max = val;
        }
        if (val < min)
        {
          min = val;
        }
      });

      if (this.props.data.hasCustomDomain)
      {
        min = Math.max(min, this.props.data.domain.get(0));
        max = Math.min(max, this.props.data.domain.get(1));
      }

      const bars: Bar[] = [];
      for (let j = 0; j < NUM_BARS; j++)
      {
        bars.push({
          id: '' + j,
          count: 0,
          percentage: 0,
          range: {
            min: min + (max - min) * j / NUM_BARS,
            max: min + (max - min) * (j + 1) / NUM_BARS,
          },
        });
      }

      results.map((v) =>
      {
        const val = +v.value;
        let i = Math.floor((val - min) / (max - min) * NUM_BARS);
        if (i === NUM_BARS)
        {
          i = NUM_BARS - 1;
        }
        if (i < 0 || i >= bars.length)
        {
          // out of bounds for our custom domain
          return;
        }

        bars[i].count++;
        bars[i].percentage += 1 / results.length;
      });

      this.setState({
        bars: List(bars),
      });

      if (!this.props.data.hasCustomDomain)
      {
        const domain = List([min, max]);
        this.setState({
          domain: this.trimDomain(this.state.maxDomain, domain),
        });
        this.props.onChange(this._ikeyPath(this.props.keyPath, 'domain'), domain, true);
      }
    }
  }

  private findTableForAlias(data: Block | List<Block>, alias: string): string
  {
    if (Immutable.List.isList(data))
    {
      const list = data as List<Block>;
      for (let i = 0; i < list.size; i++)
      {
        const table = this.findTableForAlias(list.get(i), alias);
        if (table)
        {
          return table;
        }
      }
      return null;
    }

    if (data['type'] === 'table' && data['alias'] === alias)
    {
      return data['table'];
    }

    if (Immutable.Iterable.isIterable(data))
    {
      const keys = data.keys();
      let i = keys.next();
      while (!i.done)
      {
        const value = data[i.value];
        if (Immutable.Iterable.isIterable(value))
        {
          const table = this.findTableForAlias(value, alias);
          if (table)
          {
            return table;
          }
        }
        i = keys.next();
      }
    }
    return null;
  }

  private computeTQLBars(input: CardString)
  {
    // TODO consider putting the query in context
    const { builder } = this.props;
    const { cards } = builder.query;
    const { db } = builder;

    if (typeof input === 'string')
    {
      // TODO: cache somewhere
      const parts = input.split('.');
      if (parts.length === 2)
      {
        const alias = parts[0];
        const field = parts[1];
        const table = this.findTableForAlias(cards, alias);

        if (table)
        {
          if (this.props.language === 'mysql')
          {
            this.setState(
              AjaxM1.queryM1(
                `SELECT ${field} as value FROM ${table};`, // alias select as 'value' to catch any weird renaming
                db,
                this.handleM1TQLQueryResponse,
                this.handleQueryError,
              ),
            );
          }
          return;
        }
      }
    }
    else if (input && input._isCard) // looks like this is never called
    {
      const card = input as Card;
      if (card.type === 'score' && card['weights'].size)
      {
        // only case we know how to handle so far is a score card with a bunch of fields
        //  that all come from the same table
        let finalTable: string = '';
        let finalAlias: string = '';
        card['weights'].map((weight) =>
        {
          if (finalTable === null)
          {
            return; // already broke
          }

          const key = weight.get('key');
          if (typeof key === 'string')
          {
            const parts = key.split('.');
            if (parts.length === 2)
            {
              const alias = parts[0];
              if (finalAlias === '')
              {
                finalAlias = alias;
              }
              if (alias === finalAlias)
              {
                const table = this.findTableForAlias(cards, alias);
                if (!finalTable.length)
                {
                  finalTable = table;
                }
                if (finalTable === table)
                {
                  return; // so far so good, continue
                }
              }
            }
          }

          finalTable = null; // Not good, abort!
        });

        if (finalTable)
        {
          // convert the score to TQL, do the query
          if (this.props.language === 'mysql')
          {
            // this.setState(
            //   AjaxM1.queryM1(
            //     `SELECT ${CardsToSQL._parse(card)} as value FROM ${finalTable} as ${finalAlias};`,
            //     db,
            //     this.handleQueryResponse,
            //     this.handleQueryError,
            //   ),
            // );
          }
          return;
        }
      }

      // TODO, or something
    }
    this.setState({
      bars: List([]), // no can do get bars sadly, need to figure it out one day
    });
  }

  private canAutoBound()
  {
    return this.props.data.mode === 'linear';
  }

  private handleAutoBoundChange(selected: 0 | 1)
  {
    this.props.onChange(
      this._ikeyPath(this.props.keyPath, 'autoBound'), selected === 1,
      true);
  }
}

export default Util.createTypedContainer(
  Dimensions({
    elementResize: true,
    containerStyle: {
      height: 'auto',
    },
  })(TransformCard),
  ['builder', 'spotlights'],
  {},
);
