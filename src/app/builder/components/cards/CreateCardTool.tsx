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
import * as classNames from 'classnames';
import * as React from 'react';
import * as _ from 'underscore';
import { AllBackendsMap } from '../../../../../shared/backends/AllBackends';
import BlockUtils from '../../../../../shared/blocks/BlockUtils';
import { Card } from '../../../../../shared/blocks/types/Card';
import KeyboardFocus from '../../../common/components/KeyboardFocus';
import PureClasss from '../../../common/components/PureClasss';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';
import CardDropArea from './CardDropArea';
import './CreateCardTool.less';

const AddIcon = require('./../../../../images/icon_add_7x7.svg?name=AddIcon');
const CloseIcon = require('./../../../../images/icon_close_8x8.svg?name=CloseIcon');
const AddCardIcon = require('./../../../../images/icon_addCard_22x17.svg?name=AddCardIcon');

export interface Props
{
  index: number;
  keyPath: KeyPath;
  canEdit: boolean;
  language: string;

  open?: boolean;
  dy?: number;
  className?: string;
  accepts?: List<string>;
  onToggle?: () => void;
  onClose?: () => void; // like toggle, but only called when explicitly closed
  onMinimize?: () => void; // TODO see if these should be consolidated
  hidePlaceholder?: boolean;
  cannotClose?: boolean;
  
  overrideText?: List<{
    text: string;
    type: string;
  }>; // can override the options displayed
  overrideClick?: (index: number) => void; // override the click handler
}

class CreateCardTool extends PureClasss<Props>
{
  public state: {
    closed: boolean;
    opening: boolean;
    focusedIndex: number;
  } = {
    closed: !this.props.open,
    opening: false,
    focusedIndex: -1,
  };

  handleCardClick(event)
  {
    const index = +Util.rel(event.target);
    
    if(this.props.overrideClick)
    {
      this.props.overrideClick(index);
    }
    else
    {
      const type = this.props.accepts.get(index);
      this.createCard(type);
    }
  }

  public createCard(type)
  {
    if (this.props.open && this.props.onMinimize)
    {
      this.props.onMinimize();
    }

    if (this.props.index === null)
    {
      Actions.change(
        this.props.keyPath,
        BlockUtils.make(AllBackendsMap[this.props.language].blocks[type]),
      );
    }
    else
    {
      Actions.create(this.props.keyPath, this.props.index, type);
    }

    this.props.onToggle && this.props.onToggle();
  }

  public componentWillReceiveProps(newProps)
  {
    if (newProps.open !== this.props.open)
    {
      if (newProps.open)
      {
        // first set state as not closed, so that the element renders
        // after render, animate element
        this.setState({
          closed: false,
        });
      }
      else
      {
        this.setState({
          opening: true,
        });
        // first animate closed, then set state closed so it doesn't render
        Util.animateToHeight(this.refs['selector'], 0, () =>
          this.setState({
            closed: true,
            opening: false,
          }),
        );
      }
    }
  }

  public componentDidUpdate(prevProps, prevState)
  {
    if (!prevState.opening && this.state.opening)
    {
      Util.animateToAutoHeight(this.refs['selector']);
    }
  }
  
  private renderCardOption(type: string, index: number)
  {
    const block = AllBackendsMap[this.props.language].blocks[type];
    if(!block)
    {
      console.log('Missing block type: ', block);
      // TODO throw error instead
      return null;
    }
    const text = this.props.overrideText ? this.props.overrideText.get(index).text : block.static.title;
    // data-tip={card.static.manualEntry && card.static.manualEntry.snippet}
    return (
      <a
        className={classNames({
          'create-card-button': true,
          'create-card-button-focused': this.state.focusedIndex === index,
        })}
        key={'' + index}
        rel={'' + index}
        onClick={this.handleCardClick}
        style={{
          backgroundColor: block.static.colors[0],
        }}
      >
        <div className='create-card-button-inner' rel={''+index}>
          {
            text
          }
        </div>
      </a>
    );
  }

  public renderCardSelector()
  {
    if (this.state.closed)
    {
      return null;
    }

// This used to use the following code. Keeping around in case I realize the need for it
//     let curIndex = -1; // tracks the index of the cards we are actually showing
// AllBackendsMap[this.props.language].cardsList.map((type: string, index: number) =>
//             {
//               if (this.props.accepts && this.props.accepts.indexOf(type) === -1)
//               {
//                 return null;
//               }

//               curIndex++;

    const cardTypeList = this.props.overrideText || this.props.accepts;
    
    return (
      <div
        className={classNames({
          'create-card-selector': true,
          'create-card-selector-focused': this.state.focusedIndex !== -1,
        })}
        ref='selector'
      >
        <div className='create-card-selector-inner'>
          {
            this.props.overrideText
            ?
              this.props.overrideText.map((v, index) => this.renderCardOption(v.type, index))
            :
              this.props.accepts.map(this.renderCardOption)
          }
          {
            _.map(_.range(0, 10), (i) => <div className='create-card-button-fodder' key={i} />)
          }
        </div>
        {
          !this.props.cannotClose &&
          <div
            className='close create-card-close'
            onClick={this.handleCloseClick}
          >
            <CloseIcon />
          </div>
        }
      </div>
    );
  }

  public handleCloseClick()
  {
    if (this.props.onClose)
    {
      this.props.onClose();
    }
    else
    {
      this.props.onToggle();
    }
  }

  public renderPlaceholder()
  {
    if (this.props.hidePlaceholder || this.props.open)
    {
      return null;
    }

    return (
      <div
        onClick={this.props.onToggle}
        className='create-card-placeholder'
      >
        <AddIcon />
      </div>
    );
  }

  handleFocus()
  {
    this.setState({
      focusedIndex: 0,
    });
  }

  handleFocusLost()
  {
    this.setState({
      focusedIndex: -1,
    });
  }

  handleFocusedIndexChange(focusedIndex: number)
  {
    this.setState({
      focusedIndex,
    });
  }

  handleKeyboardSelect(index: number)
  {
    const type = this.props.accepts.get(index);
    this.createCard(type);
  }

  public render()
  {
    if (!this.props.canEdit)
    {
      return null;
    }

    let classes = Util.objToClassname({
      'create-card-wrapper': true,
      'create-card-open': this.props.open,
      'create-card-closed': !this.props.open,
      'create-card-opening': this.state.opening,
    });
    classes += ' ' + this.props.className;

    let style: React.CSSProperties;

    if (this.props.dy)
    {
      style =
        {
          position: 'relative',
          top: this.props.dy,
        };
    }

    return (
      <div
        className={classes}
        style={style}
      >
        {
          this.renderPlaceholder()
        }
        {
          this.renderCardSelector()
        }
        <CardDropArea
          index={this.props.index}
          keyPath={this.props.keyPath}
          accepts={this.props.accepts}
          renderPreview={typeof this.props.index !== 'number'}
          language={this.props.language}
        />
        <KeyboardFocus
          onFocus={this.handleFocus}
          onFocusLost={this.handleFocusLost}
          index={this.state.focusedIndex}
          onIndexChange={this.handleFocusedIndexChange}
          length={this.props.accepts && this.props.accepts.size}
          onSelect={this.handleKeyboardSelect}
        />
      </div>
    );
  }
}
export default CreateCardTool;

// const cardTarget =
// {
//   canDrop(props, monitor)
//   {
//     return true;
//   },

//   drop(props, monitor, component)
//   {
//     const item = monitor.getItem();
//     if(monitor.isOver({ shallow: true}))
//     {
//       props.dndListener && props.dndListener.trigger('droppedCard', monitor.getItem());

//       setTimeout(() =>
//       {
//         // Actions.cards.move(item, props.index || 0, props.parentId); // TODO
//       }, 250);
//     }
//   }
// }

// const dropCollect = (connect, monitor) =>
// ({
//   connectDropTarget: connect.dropTarget(),
// });

// export default DropTarget('CARD', cardTarget, dropCollect)(CreateCardTool);
