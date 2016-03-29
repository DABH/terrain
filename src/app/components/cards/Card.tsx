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

require('./Card.less');

import * as React from 'react';
import Util from '../../util/Util.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";
import SelectCard from './card-types/SelectCard.tsx';
import FromCard from './card-types/FromCard.tsx';
import SortCard from './card-types/SortCard.tsx';
import FilterCard from './card-types/FilterCard.tsx';
import LetCard from './card-types/LetCard.tsx';
import ScoreCard from './card-types/ScoreCard.tsx';
import TransformCard from './card-types/TransformCard.tsx';
import WrapperCard from './card-types/WrapperCard.tsx';
import CreateCardTool from './CreateCardTool.tsx';
import Menu from '../common/Menu.tsx';
import Actions from "../../data/Actions.tsx";
import CardsContainerMixin from "./CardsContainerMixin.tsx";

var ArrowIcon = require("./../../../images/icon_arrow_8x5.svg?name=ArrowIcon");

var CARD_TYPES_WITH_CARDS = ['from', 'let', 'count', 'min', 'max', 'avg']; // 'let', 'count'

var Card = React.createClass({
	mixins: [PanelMixin, CardsContainerMixin],

	propTypes:
	{
		card: React.PropTypes.object.isRequired,
    index: React.PropTypes.number.isRequired,
    parentId: React.PropTypes.string.isRequired,
    cards: React.PropTypes.array.isRequired,
	},

	getDefaultProps():any
	{
		return {
			drag_x: false,
			drag_y: true,
			reorderOnDrag: true,
			handleRef: 'handle',
      useDropZoneManager: true,
      dropDataPropKey: 'card',
      cardsPropKeyPath: ['card', 'cards'],
      parentIdPropKeyPath: ['card', 'id'],
      dropZoneRef: 'cardBody',
		};
	},

	getInitialState()
	{
		return {
			open: true,
      ref: 'card-' + this.props.card.id,
      id: this.props.card.id,
		}
	},
  
	handleTitleClick()
	{
		if(!this.state.moved)
		{
			// this.state.moved is updated in panelMixin
      
      if(this.state.open)
      {
        Util.animateToHeight(this.refs.cardBody, 0);
      }
      else
      {
        Util.animateToAutoHeight(this.refs.cardBody); 
      }
      
			this.setState({
				open: !this.state.open,
			});
		}
	},
  
  hasCardsArea(): boolean
  {
    return !! CARD_TYPES_WITH_CARDS.find(type => type === this.props.card.type);
  },
  
  handleDelete()
  {
    Util.animateToHeight(this.refs[this.state.ref], 0);
    setTimeout(() => {
      Actions.cards.remove(this.props.card, this.props.parentId);
    }, 250);
  },
  
  handleCopy()
  {
  },

	render() {

		var CardComponent;
		var subBar;
    var isFlat = false;

		switch(this.props.card.type)
		{
			case 'select':
				CardComponent = SelectCard;
				subBar = 
				{
					content: '+',
					onClick: () => 
					{
						Actions.cards.select.create(this.props.card);
					},
				};

				break;
			case 'from':
				CardComponent = FromCard;
				subBar =
				{
					content: '+',
					onClick: () => 
					{
						Actions.cards.from.join.create(this.props.card);
					},
				};

				break;
   case 'sort':
     CardComponent = SortCard;
     break;
   case 'filter':
    CardComponent = FilterCard;
    subBar = 
        {
          content: '+',
          onClick: () => 
          {
            Actions.cards.filter.create(this.props.card);
          },
        };
      break;
    case 'let':
      CardComponent = LetCard;
      break;
    case 'transform':
      CardComponent = TransformCard;
      break;
    case 'score':
      CardComponent = ScoreCard;
      subBar =
      {
        content: '+',
        onClick: () => Actions.cards.score.create(this.props.card),
      }
      break;
    case 'count':
    case 'sum':
    case 'min':
    case 'max':
    case 'avg':
      CardComponent = WrapperCard;
		}
    
    var content = <div>This card has not been implemented yet.</div>;
    if(CardComponent)
    {
      content = <CardComponent {...this.props} draggingOver={this.state.draggingOver} draggingPlaceholder={this.state.draggingPlaceholder} />
    }

		var contentToDisplay = (
			<div className='card-content'>
				{content}
			</div>
		);

		if(subBar)
		{
			var subBarToDisplay = (
				<div className='card-sub-bar' onClick={subBar.onClick}>
					<div className='card-sub-bar-inner'>
						{subBar.content}
					</div>
				</div>
			);
		}

    var menuOptions = 
    [
      {
        text: 'Copy',
        onClick: this.handleCopy,
      },
      {
        text: 'Hide',
        onClick: this.handleTitleClick,
      },
      {
        text: 'Delete',
        onClick: this.handleDelete,
      },
    ];

		var title = this.props.card.type.charAt(0).toUpperCase() + this.props.card.type.substr(1);
		return this.renderPanel((
			<div className={'card ' + (!this.state.open ? 'card-closed' : '')} ref={this.state.ref} rel={'card-' + this.props.card.id}>
        <CreateCardTool index={this.props.index} parentId={this.props.parentId} />
				<div className='card-inner'>
					<div className='card-title' ref='handle' onClick={this.handleTitleClick}>
            { isFlat ? null : <ArrowIcon className="card-arrow-icon" /> }
            { title }
            <Menu options={menuOptions} />
					</div>
          { isFlat ? null : 
            <div className='card-body' ref='cardBody'>
    					{ contentToDisplay }
    					{ subBarToDisplay }
            </div>
          }
				</div>
			</div>
			));
	},
});

export default Card;