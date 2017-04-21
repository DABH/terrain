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

const Radium = require('radium');
import SchemaTypes from '../SchemaTypes';
import {SchemaStore, SchemaActions} from '../data/SchemaStore';
import * as React from 'react';
import * as $ from 'jquery';
import PureClasss from './../../common/components/PureClasss';
import SchemaTreeList from './SchemaTreeList';
import Styles from './SchemaTreeStyles';
import FadeInOut from '../../common/components/FadeInOut';
import SchemaSearchResults from './SchemaSearchResults';
import Util from '../../util/Util';
import SchemaResults from './SchemaResults';

export interface Props
{
	fullPage: boolean;
	showSearch: boolean;
	search?: string;
}

const horizontalDivide = 50;
const verticalDivide = 75;
const searchHeight = 42;

@Radium
class SchemaView extends PureClasss<Props>
{
	state: {
		highlightedIndex: number;
		search: string;
		
		// from Store
		databases?: SchemaTypes.DatabaseMap;
		highlightedId?: ID;
	} = {
		highlightedIndex: -1,
		search: "",
	};
	
	constructor(props:Props)
	{
		super(props);
		
		this._subscribe(SchemaStore, {
			stateKey: 'databases',
			storeKeyPath: ['databases'],
		});
		
		this._subscribe(SchemaStore, {
			stateKey: 'highlightedId',
			storeKeyPath: ['highlightedId'],
		});
	}
	
	handleSearchChange(event)
	{
		let search = event.target.value as string;
		this.setState({
			search,
			highlightedIndex: -1,
		});
		SchemaActions.highlightId(null, false);
	}
	
	handleSearchKeyDown(event)
	{
		let {highlightedIndex} = this.state;
		let offset: number = 0;
		
		switch(event.keyCode)
    {
      case 38:
        // up
        offset = -1;
      case 40:
        // down
        offset = offset || 1;
				let items = $("[data-rel='schema-item']");
        let index = Util.valueMinMax(highlightedIndex + offset, 0, items.length);
        let el = $(items[index]);
        let id = el.attr('data-id');
        let inSearchResults = !!el.attr('data-search');
        
        this.setState({
        	highlightedIndex: index,
        });
        
        SchemaActions.highlightId(id, inSearchResults);
        
        break;
        
      case 13:
      case 9:
        // enter or tab
      	
      	if(this.state.highlightedId)
      	{
      		SchemaActions.selectId(this.state.highlightedId);
      	}
      	
        // var value = visibleOptions.get(this.state.selectedIndex);
        // if(!value || this.state.selectedIndex === -1)
        // {
        //   value = event.target.value;
        // }
        // this.setState({
        //   open: false,
        //   selectedIndex: -1,
        //   value,
        // });
        // this.blurValue = value;
        // this.props.onChange(value);
        // this.refs['input']['blur']();
        break;
      case 27:
        // esc
        // this.refs['input']['blur']();
        break;
    }
	}
	
  render()
  {
  	let search = this.props.search || this.state.search;
  	let {showSearch} = this.props;
  	
    return (
      <div
      	style={Styles.schemaView}
      >
      	<div
      		style={[
      			SECTION_STYLE,
      			this.props.fullPage ? SCHEMA_STYLE_FULL_PAGE : SCHEMA_STYLE_COLUMN,
      			{
      				padding: Styles.margin,
							overflow: 'auto',
      			},
      		]}
      	>
      		{
      			showSearch &&
		      		<div
		      			style={{
		      				height: searchHeight,
		      			}}
		      		>
		      			<input
		      				type='text'
		      				placeholder='Search schema'
		      				value={search}
		      				onChange={this.handleSearchChange}
		      				onKeyDown={this.handleSearchKeyDown}
		      				style={{
		      					borderColor: '#ccc',
		      				}}
		      			/>
		      		</div>
      		}
      		<div
      			style={showSearch && {
      				height: 'calc(100% - ' + searchHeight + ')px',
      			}}
      		>
      			<FadeInOut
      				open={!!this.state.search}
      			>
      				<div
			      		style={Styles.schemaHeading}
			      	>
			      		Visible Results
			      	</div>
      			</FadeInOut>
      			
		      	<SchemaTreeList
		      		itemType='database'
		      		itemIds={this.state.databases && this.state.databases.keySeq().toList()}
		      		label={'Databases'}
		      		topLevel={true}
		      		search={search}
		      	/>
		      	
			      <SchemaSearchResults
			      	search={this.state.search}
			      />
		      </div>
	      </div>
	      
	      <div
	      	style={[
      			SECTION_STYLE,
      			this.props.fullPage ? RESULTS_STYLE_FULL_PAGE : RESULTS_STYLE_COLUMN
      		]}
	      >
	      	<SchemaResults
	      		databases={this.state.databases}
	      	/>
	      </div>
      </div>
    );
  }
}

const SECTION_STYLE = {
	position: 'absolute',
	boxSizing: 'border-box',
}

const SCHEMA_STYLE_FULL_PAGE = {
	left: 0,
	top: 0,
	width: horizontalDivide + '%',
	height: '100%',
};

const SCHEMA_STYLE_COLUMN = {
	left: 0,
	top: 0,
	width: 'calc(100% - 6px)',
	height: verticalDivide + '%',
};

const RESULTS_STYLE_FULL_PAGE = {
	left: horizontalDivide + '%',
	top: 0,
	width: (100 - horizontalDivide) + '%',
	height: '100%',
};

const RESULTS_STYLE_COLUMN = {
	left: 0,
	top: verticalDivide + '%',
	width: '100%',
	height: (100 - verticalDivide) + '%',
};


export default SchemaView;