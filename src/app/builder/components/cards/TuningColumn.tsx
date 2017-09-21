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
import InfoArea from '../../../common/components/InfoArea';
import Actions from '../../data/BuilderActions';
import { scrollAction } from '../../data/BuilderScrollStore';
import Switch from './../../../common/components/Switch';
import TerrainComponent from './../../../common/components/TerrainComponent';
import CardDropArea from './CardDropArea';
import CardsArea from './CardsArea';
import './CardsColumn.less';
import CardsDeck from './CardsDeck';
const Dimensions = require('react-dimensions');
import { AllBackendsMap } from '../../../../database/AllBackends';
import { altStyle, backgroundColor, Colors, fontColor } from '../../../common/Colors';
import { BuilderState, BuilderStore } from '../../data/BuilderStore';

import { Cards } from '../../../../blocks/types/Card';
const { List, Map } = Immutable;
const ExpandIcon = require('./../../../../images/icon_expand_12x12.svg?name=ExpandIcon');

export interface Props
{
  language: string;
  queryId: ID;
  canEdit: boolean;
  addColumn: (number, string?) => void;
  columnIndex: number;

  containerWidth?: number;
  containerHeight?: number;
  tuning?: boolean;
}

class TuningColumn extends TerrainComponent<Props>
{
  public state: {
    keyPath: KeyPath;
    tuningCards: Cards
  } = {
    keyPath: this.computeKeyPath(this.props),
    tuningCards: List([]),
  };

  public innerHeight: number = -1;

  public constructor(props: Props)
  {
    super(props);
    this._subscribe(BuilderStore, {
      updater: (state: BuilderState) =>
      {
        if (!_.isEqual(this.state.tuningCards, state.tuningCards))
        {
          this.setState({
            tuningCards: state.tuningCards,
          });
        }
      },
    });
  }

  public componentDidMount()
  {
    this.handleScroll();
  }

  public computeKeyPath(props: Props): KeyPath
  {
    return List(this._keyPath('query', 'cards'));
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.queryId !== this.props.queryId)
    {
      this.setState({
        keyPath: this.computeKeyPath(nextProps),
      });
    }

    if (nextProps.containerHeight !== this.props.containerHeight
      || nextProps.containerWidth !== this.props.containerWidth)
    {
      this.handleScroll();
    }
  }

  public handleScroll()
  {
    // TODO improve make faster
    const el = $('#cards-column');
    const start = el.offset().top;
    const totalHeight = document.getElementById('cards-column-inner').clientHeight;
    scrollAction(start, el.height(), el.scrollTop(), totalHeight);
  }

  public componentWillUpdate()
  {
    const inner = document.getElementById('cards-column-inner');
    if (inner)
    {
      const height = inner.clientHeight;
      if (height !== this.innerHeight)
      {
        if (this.innerHeight !== -1)
        {
          this.handleScroll();
        }
        this.innerHeight = height;
      }
    }
  }

  // public getTuningCards(cards)
  // {
  //   cards.forEach((card) =>
  //   {
  //     if (card.tuning)
  //     {
  //       this.tuningCards.push(card);
  //     }
  //     if (card.cards !== undefined && card.cards.size > 0)
  //     {
  //       this.getTuningCards(card.cards);
  //     }
  //   });

  // }

  public render()
  {
    const { canEdit } = this.props;
    const { keyPath, tuningCards } = this.state;
    return (
      <div
        className='cards-column'
      >
        <div
          className='cards-column-cards-area'

          onScroll={this.handleScroll}
          id='cards-column'
        >
          <div
            id='cards-column-inner'
          >
            <CardsArea
              cards={tuningCards}
              language={this.props.language}
              keyPath={keyPath}
              canEdit={canEdit}
              addColumn={this.props.addColumn}
              columnIndex={this.props.columnIndex}
              noCardTool={true}
              accepts={this.getPossibleCards()}
              tuningMode={true}
            />
          </div>
        </div>
      </div>
    );
  }

  private getPossibleCards()
  {
    return AllBackendsMap[this.props.language].topLevelCards;
  }
}

export default Dimensions()(TuningColumn);
