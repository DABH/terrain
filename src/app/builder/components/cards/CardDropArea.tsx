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
require('./CardDropArea.less');
import * as React from 'react';
import PureClasss from '../../../common/components/PureClasss';
import { DropTarget } from 'react-dnd';
const classNames = require('classnames');
import { CardItem } from './Card';
import Actions from "../../data/BuilderActions";
import BuilderTypes from '../../BuilderTypes';
import Store from '../../data/BuilderStore';

export const cardWillWrap = (targetProps:Props, cardType:string) =>
{
  return cardCanWrap(targetProps, cardType) && targetProps.singleChild;
};

export const onCardDrop = (targetProps:Props, monitor, component) =>
{
  if(monitor.isOver({ shallow: true})) // shouldn't need this: && cardTarget.canDrop(targetProps, monitor))
  {
    Actions.dropCard();

    let item = monitor.getItem();
    let {type} = item;

    if(
      item.props
      && item.props.keyPath.equals(targetProps.keyPath)
      && targetProps.index === item.props.index
    )
    {
      // dropped on itself
      return;
    }

    if(targetProps.beforeDrop)
    {
      targetProps.beforeDrop(item, targetProps);
    }

    var targetIndex = targetProps.index;
    if(targetProps.half && targetProps.lower)
    {
      // dropping above target props
      targetIndex ++;
    }

    let isWrapping = cardWillWrap(targetProps, type);

    if(isWrapping)
    {
      targetIndex = targetProps.index;
      var wrappingCardData = Store.getState().getIn(targetProps.keyPath).get(0);
      var wrappingKeyPath = targetProps.keyPath.push(targetIndex);
      Actions.remove(targetProps.keyPath, targetIndex);
    }

    if(item['new'])
    {
      // is a new card
      Actions.create(targetProps.keyPath, targetIndex, type);
    }
    else
    {
      // dragging an existing card
      let cardProps = item.props;
      var indexOffset = 0;
      Actions.nestedMove(cardProps.keyPath, cardProps.index, targetProps.keyPath, targetIndex);
    }

    if(isWrapping)
    {
      Actions.create(wrappingKeyPath.push('cards'), 0, null, wrappingCardData);
    }

    targetProps.afterDrop && targetProps.afterDrop(item, targetProps);

  }
};

// needs to be below above function on which it depends
import CardDragPreview from './CardDragPreview';

interface Props
{
  keyPath: KeyPath;
  index: number;

  half?: boolean;
  lower?: boolean;
  renderPreview?: boolean;

  isOver?: boolean;
  canDrop?: boolean;
  connectDropTarget?: (el: El) => El;

  height?: number;
  heightOffset?: number; // height will be 100% - heightOffset

  beforeDrop?: (item:CardItem, targetProps:Props) => void;
  afterDrop?: (item:CardItem, targetProps:Props) => void;
  accepts?: List<string>;

  // if set, wrapper cards which can wrap this type of card can be dropped to wrap it
  wrapType?: string;

  singleChild?: boolean; // can't have neighbors, but could still drop a wrapper card
}

class CardDropArea extends PureClasss<Props>
{
  state: {
    draggingCardItem: CardItem;
  } = {
    draggingCardItem: false,
  };

  constructor(props)
  {
    super(props);

    this._subscribe(Store, {
      stateKey: 'draggingCardItem',
      storeKeyPath: ['draggingCardItem'],
    });
  }

  selfDragging()
  {
    const item = this.state.draggingCardItem;

    return item && !item.new
      && item.props.keyPath === this.props.keyPath
      && item.props.index === this.props.index;
  }

  renderCardPreview()
  {
    if(this.selfDragging() || !this.props.renderPreview)
    {
      return null;
    }
    return (
      <CardDragPreview
        cardItem={this.state.draggingCardItem}
        visible={this.props.isOver && this.props.canDrop && !!this.state.draggingCardItem}
        keyPath={this.props.keyPath}
        index={this.props.index}
      />
    );
  }

  renderCouldDrop()
  {

    let color = 'rgba(0,0,0,0)';
    if(this.state.draggingCardItem)
    {
      color = BuilderTypes.Blocks[this.state.draggingCardItem.type].static.colors[0];
    }

    return (
      <div
        className='card-drop-area-could-drop-marker'
        style={{
          background: color,
          borderColor: color,
        }}
      />
    );
  }

	render()
  {
    if(!this.state.draggingCardItem)
    {
      return null;
    }

    var style = null;
    if(this.props.height)
    {
      style = {
        height: this.props.height,
      };
    }
    if(this.props.heightOffset)
    {
      style = {
        heightOffset: `100% - ${this.props.heightOffset}`,
      };
    }

    return this.props.connectDropTarget(
      <div
        className={classNames({
          'card-drop-area': true,
          'card-drop-area-half': this.props.half,
          'card-drop-area-upper': this.props.half && !this.props.lower,
          'card-drop-area-lower': this.props.half && this.props.lower,
          'card-drop-area-over': this.props.isOver,
          'card-drop-area-could-drop': this.state.draggingCardItem
            && cardCouldWrap(this.props, this.state.draggingCardItem),
          'card-drop-area-can-drop': this.props.canDrop,
          'card-drop-area-over-self': this.props.isOver && this.selfDragging(),
          'card-drop-area-render-preview': this.props.renderPreview,
        })}
        style={style}
      >
        <div
          className='card-drop-area-inner'
          style={{
            zIndex: 99999999 + this.props.keyPath.size,
          }}
        />

        {
          this.renderCouldDrop()
        }
        {
          this.renderCardPreview()
        }
      </div>
	  );
	}
}

const cardCanWrap = (targetProps:Props, cardType:string) =>
{
  if(targetProps.wrapType)
  {
    if(!targetProps.accepts || targetProps.accepts.indexOf(cardType) === -1)
    {
      // this card doesn't fit in this area
      return false;
    }

    let {accepts} = BuilderTypes.Blocks[cardType].static;
    if(accepts && accepts.indexOf(targetProps.wrapType) !== -1)
    {
      return true;
    }
  }
  return false;
};

// as neighbor
const cardCanAccept = (targetProps:Props, cardType:string) =>
{
  return (targetProps.accepts && targetProps.accepts.indexOf(cardType) !== -1)
    || BuilderTypes.Blocks[cardType].static.anythingAccepts;
};

const cardCouldWrap = (targetProps:Props, item:CardItem) =>
{
  const {type} = item;

  let isNew = item['new'];
  if(!isNew)
  {
    let itemKeyPath = item.props.keyPath;
    let targetKeyPath = targetProps.keyPath;

    if(itemKeyPath.equals(targetKeyPath))
    {
      // can drop on itself
      return true;
    }

    let itemChildKeyPath = itemKeyPath.push(item.props.index);
    if(targetKeyPath.size >= itemChildKeyPath.size)
    {
      // can't drag a card into a card that is within itself
      // so make sure that the itemKeyPath is not a prefix for the targetKeyPath
      if(
        targetKeyPath.splice(itemChildKeyPath.size, targetKeyPath.size - itemChildKeyPath.size)
        .equals(itemChildKeyPath)
      ){
        // can't drop in yoself
        return false;
      }
    }
  }

  if(cardWillWrap(targetProps, type))
  {
    return true;
  }

  if(targetProps.singleChild)
  {
    return false;
  }

  if(!cardCanAccept(targetProps, type))
  {
    return false;
  }

  return true;
};

const cardTarget =
{
  canDrop(targetProps:Props, monitor)
  {
    let item = monitor.getItem() as CardItem;
    return cardCouldWrap(targetProps, item);
  },

  hover(targetProps:Props, monitor)
  {
    if(monitor.isOver({ shallow: true}))
    {
      let state = Store.getState();
      var keyPath: KeyPath = null;
      var index: number = null;

      if(monitor.canDrop())
      {
        keyPath = targetProps.keyPath;
        index = targetProps.index;
        let {type} = monitor.getItem();

        if(targetProps.lower)
        {
          index ++;
        }
      }

      if(keyPath !== state.draggingOverKeyPath || index !== state.draggingOverIndex)
      {
        Actions.dragCardOver(keyPath, index);
      }
    }

  },

  drop: (targetProps:Props, monitor, component) =>
  {
    onCardDrop(targetProps, monitor, component);
  },
};

const dropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver({ shallow: true }),
  canDrop: monitor.isOver({ shallow: true }) && monitor.canDrop(),
  item: monitor.getItem(),
});


export default DropTarget('CARD', cardTarget, dropCollect)(CardDropArea);
