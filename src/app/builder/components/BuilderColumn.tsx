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

import * as _ from 'underscore';
require('./BuilderColumn.less');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Immutable from 'immutable';
const {List} = Immutable;
import Util from '../../util/Util.tsx';
import Menu from '../../common/components/Menu.tsx';
import { MenuOption } from '../../common/components/Menu.tsx';
import PanelMixin from './layout/PanelMixin.tsx';
import InputsArea from "./inputs/InputsArea.tsx";
import CardsColumn from "./cards/CardsColumn.tsx";
import ResultsArea from "./results/ResultsArea.tsx";
import UserStore from '../../users/data/UserStore.tsx';
import RolesStore from '../../roles/data/RolesStore.tsx';
import LibraryTypes from '../../library/LibraryTypes.tsx';
import BuilderTQLColumn from '../../tql/components/BuilderTQLColumn.tsx';
import InfoArea from '../../common/components/InfoArea.tsx';
const shallowCompare = require('react-addons-shallow-compare');
import * as moment from 'moment';
import Ajax from "./../../util/Ajax.tsx";
import Manual from './../../manual/components/Manual.tsx';


var SplitScreenIcon = require("./../../../images/icon_splitScreen_13x16.svg?name=SplitScreenIcon");
var CloseIcon = require("./../../../images/icon_close_8x8.svg?name=CloseIcon");
var LockedIcon = require("./../../../images/icon_lock.svg?name=LockedIcon");

var BuilderIcon = require("./../../../images/icon_builder.svg");
var ResultsIcon = require("./../../../images/icon_resultsDropdown.svg");
var TQLIcon = require("./../../../images/icon_tql.svg");
var InputsIcon = require("./../../../images/icon_input.svg");
var ManualIcon = require('./../../../images/icon_info.svg');

enum COLUMNS {
  Builder,
  Results,
  TQL,
  Inputs,
  Manual,
};
var NUM_COLUMNS = 5;

var menuIcons = [
    {icon: <BuilderIcon />, color: '#76a2c1'},
    {icon: <ResultsIcon />, color: '#71bca2'},
    {icon: <TQLIcon />, color: '#d47884'},
    {icon: <InputsIcon />, color: '#c2b694'},
    {icon: <ManualIcon />, color: "#a98abf"}
];

// interface Props
// {
//   title: string;
//   children?: any;
//   className?: string;
  
//   // Options not yet supported
//   menuOptions?: {
//     text: string;
//     onClick: () => void;
//   }[];
// }

var BuilderColumn = React.createClass<any, any>(
{
  mixins: [PanelMixin],
  
  propTypes:
  {
    query: React.PropTypes.object.isRequired,
    className: React.PropTypes.string,
    index: React.PropTypes.number,
    canAddColumn: React.PropTypes.bool,
    canCloseColumn: React.PropTypes.bool,
    onAddColumn: React.PropTypes.func.isRequired,
    onAddManualColumn: React.PropTypes.func.isRequired,
    onCloseColumn: React.PropTypes.func.isRequired,
    colKey: React.PropTypes.number.isRequired,
    history: React.PropTypes.any,
    onRevert: React.PropTypes.func,
    columnType: React.PropTypes.number,
    selectedCardName: React.PropTypes.string,
    switchToManualCol: React.PropTypes.func,
    changeSelectedCardName: React.PropTypes.func,
  },
  
  getInitialState()
  {
    let colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
    var column = colKeyTypes[this.props.colKey];
    if(column === undefined)
    {
      column = this.props.index;
      colKeyTypes[this.props.colKey] = this.props.index;
      localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
    }

    return {
      column: this.props.columnType ? this.props.columnType : column,
      loading: false,
      // rand: 1,
    }
  },

  componentDidMount()
  {
    if(this.state.column === 4)
    {
      this.props.switchToManualCol(this.props.index);
    }
  },
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return shallowCompare(this, nextProps, nextState);
  },
  
  componentWillMount()
  {
    // TODO fix
    let rejigger = () => this.setState({ rand: Math.random() });
    this.unsubUser = UserStore.subscribe(rejigger);
    this.unsubRoles = RolesStore.subscribe(rejigger);
  },
  
  componentWillUnmount()
  {
    this.unsubUser && this.unsubUser();  
    this.unsubRoles && this.unsubRoles();  
  },
  
  getDefaultProps()
  {
    return {
      drag_x: true,
      dragInsideOnly: true,
      reorderOnDrag: true,
      handleRef: 'handle',
    };
  },
  
  handleLoadStart()
  {
    this.setState({
      loading: true,
    })
  },
  
  handleLoadEnd()
  {
    this.setState({
      loading: false,
    });
  },
  
  renderContent(canEdit:boolean)
  {
    var query = this.props.query;
    switch(this.state.column)
    {
      case COLUMNS.Builder:
        // this should be temporary; remove when middle tier arrives
        // var spotlights = Immutable.List(query.results ? query.results.reduce((spotlights, result) =>
        // {
        //   if(result.spotlight)
        //   {
        //     spotlights.push(result);
        //   }
        //   return spotlights;
        // }, []) : []);
        // TODO
        let spotlights = Immutable.List([]);
        
        if (this.props.query.mode === "tql")
        {
          return <InfoArea
             large= "TQL Mode"
             small= "This Variant is in TQL mode, so it doesn’t use Cards. To restore this Variant to its last Card state, change it to Cards mode in the TQL column."
          />;
        }
        
        return <CardsColumn 
          cards={query.cards} 
          deckOpen={query.deckOpen}
          queryId={query.id}
          spotlights={spotlights} 
          canEdit={canEdit}
          addColumn={this.props.onAddManualColumn}
          columnIndex={this.props.index}
        />;
        
      case COLUMNS.Inputs:
        return <InputsArea
          inputs={query.inputs}
          queryId={query.id}
        />;
      
      case COLUMNS.Results:
        return <ResultsArea 
          query={query}
          onLoadStart={this.handleLoadStart}
          onLoadEnd={this.handleLoadEnd}
          canEdit={canEdit}
        />;

      case COLUMNS.TQL:
        return <BuilderTQLColumn
          canEdit={canEdit}
          query={query}
          onLoadStart={this.handleLoadStart}
          onLoadEnd={this.handleLoadEnd}
          addColumn={this.props.onAddManualColumn}
          columnIndex={this.props.index}
        />;
        
      case COLUMNS.Manual:
        return <Manual 
          selectedKey={this.props.selectedCardName}
          changeCardName={this.props.changeSelectedCardName}
        />;
    }
    return <div>No column content.</div>;
  },
  
  switchView(index)
  {
    if(index === 4)
    {
      this.props.switchToManualCol(this.props.index);
    }
    else if(this.state.column === 4)
    {
      this.props.switchToManualCol(-1);
    }
    
    this.setState({
      column: index,
    });
    
    var colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
    colKeyTypes[this.props.colKey] = index;
    localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
  },
  
  getMenuOptions(): List<MenuOption> //TODO
  {
    var options: List<MenuOption> = Immutable.List(_.range(0, NUM_COLUMNS).map(index => ({
      text: COLUMNS[index],
      onClick: this.switchView,
      disabled: index === this.state.column,
      icon: menuIcons[index].icon,
      iconColor: menuIcons[index].color
    })));
    
    return options;
  },
  
  handleAddColumn()
  {
    this.props.onAddColumn(this.props.index);
  },
  
  handleCloseColumn()
  {
    this.props.onCloseColumn(this.props.index);
    
    var colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
    delete colKeyTypes[this.props.colKey];
    localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
  },
  
  revertVersion()
  {
    if (this.props.query.version) 
    {
      if (confirm('Are you sure you want to revert? Reverting Resets the Variant’s contents to this version. You can always undo the revert, and reverting does not lose any of the Variant’s history.')) 
      {
        this.props.onRevert();
      }
    }
  },

  renderBuilderVersionToolbar(canEdit)
  {
    if(this.props.query.version)
    {
      if (this.state.column === COLUMNS.Builder || this.state.column === COLUMNS.TQL)
      {
        var lastEdited = moment(this.props.query.lastEdited).format("h:mma on M/D/YY")
        return (
          <div className='builder-revert-toolbar'> 
            <div className='builder-revert-time-message'>
              Version from {lastEdited}
            </div>
            <div className='builder-white-space'/>
            {
              canEdit ? 
                  <div 
                    className='button builder-revert-button' 
                    onClick={this.revertVersion} 
                    //data-tip="Resets the Variant's contents to this version. You can always undo the revert, and reverting does not lose any of the Variant's history."
                  >
                    Revert to this version
                  </div>
                  : <div />
             }
          </div>
          );
      }
    }
  },

  render() {
    let {query} = this.props;
    let canEdit = (query.status === LibraryTypes.EVariantStatus.Build
      && Util.canEdit(query, UserStore, RolesStore))
      || this.state.column === COLUMNS.Inputs;
    let cantEditReason = query.status !== LibraryTypes.EVariantStatus.Build ?
      'This Variant is not in Build status' : 'You are not authorized to edit this Variant';
    
    return this.renderPanel((
      <div className={'builder-column builder-column-' + this.props.index}>
        <div className='builder-title-bar'>
          { 
            this.props.index === 0 ? null : (
              <div className='builder-resize-handle' ref='resize-handle'>
                <div className='builder-resize-handle-line'></div>
                <div className='builder-resize-handle-line'></div>
              </div>
            )
          }
          <div className='builder-title-bar-title'>
            <span ref='handle'>
              { COLUMNS[this.state.column] }
              {
                !canEdit ? 
                  <LockedIcon data-tip={cantEditReason} />
                : null
              }
            </span>
            {
              this.state.loading &&
              (this.state.column === COLUMNS.Results || this.state.column === COLUMNS.TQL) &&
                <div className='builder-column-loading'>Loading...</div>
            }
          </div>
          <div className='builder-title-bar-options'>
            {
              this.props.canCloseColumn && 
                <CloseIcon
                  onClick={this.handleCloseColumn}
                  className='close close-builder-title-bar'
                  data-tip="Close Column"
                />
            }
            {
              this.props.canAddColumn && 
                <SplitScreenIcon
                  onClick={this.handleAddColumn}
                  className='bc-options-svg builder-split-screen'
                  data-tip="Add Column"
                />
            }
            <Menu options={this.getMenuOptions()}/>
          </div>
        </div>
        {this.renderBuilderVersionToolbar(canEdit)}
        <div className={
            (this.state.column === COLUMNS.Manual ? 'builder-column-manual ' : '') +
            'builder-column-content ' + 
            (this.state.column === COLUMNS.Builder ? ' builder-column-content-scroll' : '') +
            (this.state.column === COLUMNS.Inputs ? ' builder-column-content-scroll' : '') 
          }>
          { this.renderContent(canEdit) }
        </div>
      </div>
    ));
  }
}
);

export default BuilderColumn;
