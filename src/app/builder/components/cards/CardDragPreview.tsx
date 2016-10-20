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

// an invisible area covering the upper or lower half of a card, sensing that a card can be dropped
import * as Immutable from 'immutable';
require('./CardDragPreview.less');
import * as React from 'react';
import PureClasss from '../../../common/components/PureClasss.tsx';
import { DropTarget } from 'react-dnd';
const classNames = require('classnames');
import { CardItem } from './Card.tsx';
import Actions from "../../data/BuilderActions.tsx";
import BuilderTypes from '../../BuilderTypes.tsx';
import Store from '../../data/BuilderStore.tsx';
import {onCardDrop, cardWillWrap} from './CardDropArea.tsx';

interface CDPProps
{
  cardItem: CardItem;
  visible: boolean;
  isInList?: boolean; // takes up physical space in a list of cards
  keyPath: KeyPath;
  index: number;
  beforeDrop?: (item:CardItem, targetProps:CDPProps) => void;
  accepts?: List<string>;
  
  // if set, wrapper cards which can wrap this type of card can be dropped to wrap it
  wrapType?: string;
  wrapUp?: boolean; // wrap placeholder should extend up
  
  connectDropTarget?: (el: El) => El;
  singleChild?: boolean; // can't have neighbors, but could still drop a wrapper card
}

class CardDragPreview extends PureClasss<CDPProps>
{  
  noCardColors: string[] = ['#aaa', '#aaa'];
  
  state: {
    justDropped: boolean;
  } = {
    justDropped: null,
  }
  
  timeout: any;
  
  componentWillReceiveProps(nextProps:CDPProps)
  {
    if(this.props.cardItem && !nextProps.cardItem)
    {
      // was dropped
      this.setState({
        justDropped: true,
      });
      this.timeout = setTimeout(() => this.setState({ justDropped: false }), 200);
    }
  }
  
  componentWillUnmount()
  {
    this.timeout && clearTimeout(this.timeout);
  }
  
  render()
  {
    const item = this.props.cardItem;
    
    if(!item)
    {
      return <div />;
    }
    
    if(item)
    {
      var {type} = item;
      if(BuilderTypes.Blocks[type])
      {
        var colors: string[] = BuilderTypes.Blocks[type].static.colors;
        var title: string = BuilderTypes.Blocks[type].static.title;
        var preview = "New";
        if(!item['new'])
        {
          preview = BuilderTypes.getPreview(item.props.card);
        }
      }
    }
    else
    {
      var colors = this.noCardColors;
      var preview = "None";
      var title = "None";
    }
    
    let {visible, cardItem} = this.props;

    if(visible && cardItem.props 
      && cardItem.props.keyPath === this.props.keyPath)
    {
      if(cardItem.props.index === this.props.index || cardItem.props.index === this.props.index - 1)
      {
        visible = false;
      }
    }
    
    let willWrap = this.props.cardItem 
            && cardWillWrap(this.props, this.props.cardItem.type);
    
    return this.props.connectDropTarget(
      <div
        className={classNames({
          'card-drag-preview': true,
          'card-drag-preview-visible': visible,
          'card-drag-preview-in-list': this.props.isInList,
          'card-drag-preview-dropped': this.state.justDropped,
          'card-drag-preview-wrap': willWrap,
          'card-drag-preview-wrap-up': willWrap && this.props.wrapUp,
        })}
        
        style={{
          background: '#fff',
          borderColor: colors[0],
        }}
      >
        <div
          className='card-title card-title-closed'
          style={{
            background: colors[0],
          }}
        >
          <div className='card-title-inner'>
            {
              title
            }
          </div>
          <div
            className='card-preview'
          >
            {
              preview
            }
          </div>
        </div>
        <div
          className='card-drag-preview-wrap-handle'
          style={{
            borderColor: colors[0],
          }}
        >
          <div
            className='card-drag-preview-wrap-handle-inner'
            style={{
              background: colors[0],
            }}
          />
        </div>
      </div>
    );
  }
}

const cardPreviewTarget = 
{
  canDrop(targetProps:CDPProps, monitor)
  {
    return true;
  },
  
  drop: (targetProps:CDPProps, monitor, component) =>
  {
    onCardDrop(targetProps, monitor, component);
  },
}

const cardPreviewCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
  // isOver: monitor.isOver({ shallow: true }),
  // canDrop: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  // item: monitor.getItem(),
});


export default DropTarget('CARD', cardPreviewTarget, cardPreviewCollect)(CardDragPreview);