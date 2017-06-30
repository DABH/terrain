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
import './CardStyle.less';

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as React from 'react';
import { DragSource } from 'react-dnd';
import * as ReactDOM from 'react-dom';
import * as _ from 'underscore';
const { createDragPreview } = require('react-dnd-text-dragpreview');
import { Card } from '../../../../../shared/blocks/types/Card';
import { Menu, MenuOption } from '../../../common/components/Menu';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';
import LayoutManager from '../layout/LayoutManager';
import { Display } from './../../../../../shared/blocks/displays/Display';
import PureClasss from './../../../common/components/PureClasss';
import ManualPopup from './../../../manual/components/ManualPopup';
import { BuilderScrollState, BuilderScrollStore } from './../../data/BuilderScrollStore';
import Store from './../../data/BuilderStore';
import CardDropArea from './CardDropArea';
const CDA = CardDropArea as any;
import { AllBackendsMap } from '../../../../../shared/backends/AllBackends';
import * as BlockUtils from '../../../../../shared/blocks/BlockUtils';
import SchemaStore from '../../../schema/data/SchemaStore';
import BuilderComponent from '../BuilderComponent';
import CreateCardTool from './CreateCardTool';
import { Colors, backgroundColor, fontColor, link } from '../../../common/Colors';
const ArrowIcon = require('./../../../../images/icon_arrow_8x5.svg?name=ArrowIcon');
const HandleIcon = require('./../../../../images/icon_more_12x3.svg?name=MoreIcon');

const CARD_OVERSCAN = 200;
const CARD_HEIGHT_MAP: { [id: string]: number } = {};

export interface Props
{
  card: Card;
  index: number;
  singleCard?: boolean; // for BuilderTextboxCards
  singleChild?: boolean; // for cards like Where that are wrappers but only accept 1 child

  canEdit: boolean;
  keyPath: KeyPath;
  accepts?: List<string>;

  addColumn?: (number, string?) => void;
  columnIndex?: number;
  helpOn?: boolean;

  isDragging?: boolean;
  connectDragPreview?: (a?: any) => void;
  connectDragSource?: (el: El) => El;

  display?: Display;
}

class _CardComponent extends PureClasss<Props>
{
  public state: {
    selected: boolean;
    hovering: boolean;
    closing: boolean;
    opening: boolean;
    menuOptions: List<MenuOption>;

    scrollState: BuilderScrollState;
  };

  public refs: {
    [k: string]: Ref;
    card: Ref;
    cardInner: Ref;
    cardBody: Ref;
  };

  // _debugUpdates = true;
  public _debugName = 'Card';

  public dragPreview: any;

  public cardEl: HTMLElement;
  public renderTimeout: any;

  constructor(props: Props)
  {
    super(props);

    this.state = {
      selected: false,
      hovering: false,
      closing: false,
      opening: false,
      menuOptions:
      Immutable.List([
        // {
        //   text: 'Copy',
        //   onClick: this.handleCopy,
        // },
        {
          text: 'Duplicate',
          onClick: this.handleDuplicate,
        },
        {
          text: 'Delete',
          onClick: this.handleDelete,
        },
      ]),

      scrollState: BuilderScrollStore.getState(),
    };

  }

  public componentWillMount()
  {
    // TODO
    // this._subscribe(Store, {
    //   stateKey: 'selected',
    //   storeKeyPath: ['selectedCardIds', props.card.id],
    // });

    this._subscribe(Store, {
      updater: (state) =>
      {
        if (state.hoveringCardId === this.props.card.id && !this.state.hovering)
        {
          this.setState({
            hovering: true,
          });
        }
        else if (this.state.hovering)
        {
          this.setState({
            hovering: false,
          });
        }
      },
      isMounted: true,
    });

    this._subscribe(BuilderScrollStore, {
      stateKey: 'scrollState',
      isMounted: true,
    });
  }

  public getCardTerms(card: Card): List<string>
  {
    let terms: List<string> = Immutable.List([]);

    if (card.static.getChildTerms)
    {
      terms = card.static.getChildTerms(card, SchemaStore.getState());
    }

    if (card.static.getNeighborTerms)
    {
      terms = terms.concat(card.static.getNeighborTerms(card, SchemaStore.getState())).toList();
    }

    return terms;
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.card.closed !== this.props.card.closed)
    {
      if (this.state.closing || this.state.opening)
      {
        // completed closing / opening
        this.setState({
          closing: false,
          opening: false,
        });
      }
      else
      {
        // closed it from some outside source? need to close here
        this.toggleClose(null);
      }
    }
  }

  public componentDidMount()
  {
    if (this.props.card.type === 'creating')
    {
      return;
    }

    this.dragPreview = createDragPreview(
      this.props.card.static.title + ' (' + BlockUtils.getPreview(this.props.card) + ')',
      {
        backgroundColor: this.props.card.static.colors[0],
        borderColor: this.props.card.static.colors[0],
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        paddingTop: 7,
        paddingRight: 12,
        paddingBottom: 9,
        paddingLeft: 12,
        borderRadius: 10,
      });

    this.props.connectDragPreview(this.dragPreview);
  }

  public toggleClose(event)
  {
    if (this.state.closing || this.state.opening)
    {
      return; // I just don't want to deal
    }

    if (!this.props.card.closed)
    {
      this.setState({
        closing: true,
      });

      // animate just the body for normal cards,
      //  the entire card for cards inside textboxes
      const ref = this.props.singleCard ? this.refs.card : this.refs.cardBody;

      Util.animateToHeight(ref, 0, () =>
      {
        // do this after the animation so the rest of the app picks up on it
        Actions.change(
          this.getKeyPath().push('closed'),
          true,
        );
      });
    }
    else
    {
      this.setState({
        opening: true,
      });

      // need to set a timeout so that the Card's render first
      //  executes (from the opening:true setState) and adds in the
      //  card body, for us to animate to.
      // If you know a better way, please oh please implement it
      setTimeout(() =>
        Util.animateToAutoHeight(this.refs.cardBody, () =>
        {
          // do this after the animation so the rest of the app picks up on it
          Actions.change(
            this.getKeyPath().push('closed'),
            false,
          );
        }),
        250,
      );
    }

    event && event.preventDefault();
    event && event.stopPropagation();
  }

  public handleTitleClick(event)
  {
    // TODO decide how selection mechanics work.
    //  consider limiting selection to neighbors.
    // if(!this.props.canEdit)
    // {
    //   return;
    // }

    // event.stopPropagation();
    // event.preventDefault();
    // Actions.selectCard(this.props.card.id, event.shiftKey, event.altKey);
  }

  public handleDelete()
  {
    Util.animateToHeight(this.refs.cardInner, 0);
    setTimeout(() =>
      Actions.remove(this.props.keyPath, this.props.index)
      , 250);
  }

  public handleCopy()
  {
  }

  public handleDuplicate()
  {
    if (this.props.singleCard || this.props.singleChild)
    {
      alert("Can't duplicate this card because it is not in a position where it can have neighborhing cards. Try moving it to another spot on the Builder and duplicating it there.");
      return;
    }

    const removeId = (block) =>
    {
      if (Immutable.Iterable.isIterable(block))
      {
        if (block.get('id'))
        {
          block = block.set('id', '');
        }
        let b = block.map(removeId);
        if (!b)
        {
          // records don't have a map fn
          b = block.toMap().map(removeId);
        }
        return b;
      }

      return block;
    };

    const card = BlockUtils.recordFromJS(
      BlockUtils.cardsForServer(removeId(this.props.card)).toJS(),
      AllBackendsMap[this.props.card.static.language].blocks,
    );

    Actions.create(this.props.keyPath, this.props.index + 1, card.type, card);

  }

  public handleMouseMove(event)
  {
    event.stopPropagation();
    if (!this.state.hovering)
    {
      Actions.hoverCard(this.props.card.id);
    }
  }

  public getKeyPath()
  {
    return this.props.singleCard
      ? this.props.keyPath
      : this._ikeyPath(this.props.keyPath, this.props.index);
  }

  public handleCardToolClose()
  {
    if (this.props.index === null)
    {
      Actions.change(this.props.keyPath, '');
    }
    else
    {
      Actions.remove(this.props.keyPath, this.props.index);
    }
  }

  public componentWillUnmount()
  {
    this.renderTimeout && clearTimeout(this.renderTimeout);
  }

  public render()
  {
    const { id } = this.props.card;
    this.cardEl = document.getElementById(this.props.card.id); // memoize?
    if (this.cardEl)
    {
      const { columnTop, columnHeight, columnScroll } = this.state.scrollState;
      const visibleStart = columnScroll - CARD_OVERSCAN;
      const visibleEnd = columnScroll + columnHeight + CARD_OVERSCAN;

      let cardStart = 0;
      let el = this.cardEl;
      do
      {
        cardStart += el.offsetTop;
        el = el.offsetParent as any;
      } while (el && el.id !== 'cards-column');

      if (el)
      {
        // if cards are nested inside position:relative/absolute components, you will
        //  need to loop through offsetParent until you reach the column, summing offsetTop
        const cardHeight = this.cardEl.clientHeight;
        const cardEnd = cardStart + cardHeight;

        CARD_HEIGHT_MAP[id] = cardHeight;

        if (cardEnd < visibleStart || cardStart > visibleEnd)
        {
          // TODO fix bug here where you have the CreateCardTool open
          //  and scroll to the bottom of the column and it expands
          //  cardHeight ad infinitum
          return (
            <div
              className='card card-placeholder'
              id={id}
              style={{
                height: cardHeight,
              }}
            />
          );
        }
      }
    }
    else
    {
      this.renderTimeout = setTimeout(() =>
      {
        this.setState({ random: Math.random() });
      }, 15);

      return (
        <div
          className='card card-placeholder'
          id={id}
          style={{
            minHeight: CARD_HEIGHT_MAP[id] || 50,
          }}
        />
      );
    }

    if (this.props.card.type === 'creating')
    {
      // not a card at all, in fact. a create card marker
      return (
        <div
          id={id}
        >
          <CreateCardTool
            canEdit={this.props.canEdit}
            index={this.props.index}
            keyPath={this.props.keyPath}
            open={true}
            onClose={this.handleCardToolClose}
            accepts={this.props.display && this.props.display.accepts}
            language={this.props.card.static.language}
          />
        </div>
      );
    }

    const content = <BuilderComponent
      canEdit={this.props.canEdit}
      data={this.props.card}
      helpOn={this.props.helpOn}
      addColumn={this.props.addColumn}
      columnIndex={this.props.columnIndex}
      keyPath={this.getKeyPath()}
      language={this.props.card.static.language}
    />;

    const { card } = this.props;
    const { title } = card.static;
    const { isDragging, connectDragSource } = this.props;

    // TODO
    // <ManualPopup
    //                 cardName={card.static.title}
    //                 rightAlign={!this.props.canEdit}
    //                 addColumn={this.props.addColumn}
    //                 columnIndex={this.props.columnIndex}
    //               />

    return (
      <div
        className={classNames({
          'card': true,
          'card-dragging': isDragging,
          'card-closed': this.props.card.closed,
          'single-card': this.props.singleCard,
          'card-selected': this.state.selected,
          'card-hovering': this.state.hovering,
          'card-closing': this.state.closing,
          'card-opening': this.state.opening,
          [card.type + '-card']: true,
        })}
        ref='card'
        id={id}
        onMouseMove={this.handleMouseMove}
        style={backgroundColor(Colors().builder.cards.cardBase)}
      >
        <CDA
          half={true}
          keyPath={this.props.keyPath}
          index={this.props.index}
          accepts={this.props.accepts}
          wrapType={this.props.card.type}
          singleChild={this.props.singleChild || this.props.singleCard}
          language={card.static.language}
        />
        <div
          className={'card-inner ' + (this.props.singleCard ? 'single-card-inner' : '')}
          style={{
            background: card.static.colors[1],
            borderColor: card.static.colors[0],
          }}
          ref='cardInner'
        >
          {
            connectDragSource(
              <div
                className={classNames({
                  'card-title': true,
                  'card-title-closed': (this.props.card.closed && !this.state.opening) || this.state.closing,
                  'card-title-card-hovering': this.state.hovering,
                })}

                onClick={this.handleTitleClick}
              >
                {
                  this.props.canEdit &&
                  <HandleIcon
                    className='card-handle-icon'
                  />
                }
                {
                  this.state.hovering &&
                  <ArrowIcon className='card-minimize-icon' onClick={this.toggleClose} />
                }
                {
                  ! localStorage['hideTitle'] &&
                    <div
                      className='card-title-inner'
                      style={{
                        background: card.static.colors[0],
                      }}
                    >
                      {
                        title
                      }
                    </div>
                }

                {
                  !this.props.card.closed ? null :
                    <div className={classNames({
                      'card-preview': true,
                      'card-preview-hidden': this.state.opening,
                    })}>
                      {BlockUtils.getPreview(card)}
                    </div>
                }
                {
                  this.props.canEdit &&
                  this.state.hovering &&
                  <Menu
                    options={this.state.menuOptions}
                  />
                }
              </div>,
            )
          }

          {
            (!this.props.card.closed || this.state.opening) &&
            <div className='card-body-wrapper' ref='cardBody'>
              <div className='card-body'>
                {
                  content
                }
              </div>
            </div>
          }
        </div>
        <CDA
          half={true}
          lower={true}
          keyPath={this.props.keyPath}
          index={this.props.index}
          accepts={this.props.accepts}
          wrapType={this.props.card.type}
          singleChild={this.props.singleChild || this.props.singleCard}
          language={card.static.language}
        />
      </div>
    );
  }
}

// Drag and Drop (the bass)

export interface CardItem
{
  props?: Props;
  childIds?: IMMap<ID, boolean>;
  new?: boolean;
  type?: string;
}

const cardSource =
  {
    canDrag: (props) => props.canEdit,

    beginDrag: (props: Props): CardItem =>
    {
      // TODO
      setTimeout(() => $('body').addClass('body-card-is-dragging'), 100);
      const item: CardItem = {
        props,
        childIds: BlockUtils.getChildIds(props.card)
          .remove(props.card.id),
        type: props.card.type,
      };

      Actions.dragCard(item);

      return item;
    },
    // select card?

    endDrag: () =>
    {
      $('body').removeClass('body-card-is-dragging');

      Actions.dragCard(false);
    },
  };

const dragCollect = (connect, monitor) =>
  ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
    connectDragPreview: connect.dragPreview(),
  });

export const CardComponent = DragSource('CARD', cardSource, dragCollect)(_CardComponent);

export default CardComponent;
