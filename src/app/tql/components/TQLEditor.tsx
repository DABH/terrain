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

require('./TQLEditor.less');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
const {List} = Immutable;
import ResultsView from './ResultsView.tsx';
import Menu from './../../common/components/Menu.tsx';
import { MenuOption } from '../../common/components/Menu.tsx';
import Switch from './../../common/components/Switch.tsx';
import TQLConverter from '../TQLConverter.tsx';
import BuilderActions from './../../builder/data/BuilderActions.tsx';
import BuilderTypes from '../../builder/BuilderTypes.tsx';
import * as _ from 'underscore';
import Classs from './../../common/components/Classs.tsx';
import Ajax from "./../../util/Ajax.tsx";
import Modal from './../../common/components/Modal.tsx';

//Node Modules
var CodeMirror = require('./Codemirror.js');

//Style sheets and addons for code-mirror
require('./tql.js');
import './codemirror.less';
import './monokai.less';
import './cobalt.less';
import './neo.less';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/display/placeholder.js';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/lint/lint.js';

//Searching for code-mirror
import 'codemirror/addon/dialog/dialog.js';
import './dialog.less';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/scroll/annotatescrollbar.js';
import 'codemirror/addon/search/matchesonscrollbar.js';
import 'codemirror/addon/search/jump-to-line.js';
import 'codemirror/addon/search/matchesonscrollbar.css';

import ManualPopup from './../../manual/components/ManualPopup.tsx';
import TQLPopup from './TQLPopup.tsx';

interface Props {
  params?: any;
  query?: BuilderTypes.IQuery;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  addColumn?: (number, string?) => void;
  index: number;
}

class TQL extends Classs<Props>
{
  state:
  {
    tql: string;
    code: string;
    theme: string;
    highlightedLine: number;
    theme_index: number;
    confirmModalOpen: boolean;
    confirmModalMessage: string;
    syntaxHelpOpen: boolean;
    syntaxHelpPos: any;
    cardName: string;
    termDefinitionOpen: boolean;
    termDefinitionPos: any;
  } = {
    tql: null,
    code: TQLConverter.toTQL(this.props.query),
    theme: localStorage.getItem('theme') || 'default',
    highlightedLine: null,
    theme_index: 0,
    confirmModalOpen: false,
    confirmModalMessage: '',
    syntaxHelpOpen: false,
    syntaxHelpPos: {},
    cardName: '',
    termDefinitionOpen: false,
    termDefinitionPos: {}
  };

  constructor(props: Props) 
  {
    super(props);
    this.executeCode = _.debounce(this.executeCode, 1000);
  }

  //This function should be here, but whenever executeCode is called, the cards/tql
  //are not longer in sync
  componentDidMount() 
  {
    if (this.props.query.mode !== 'tql') 
    {
      this.executeCode();
    }
  }

  updateCode(newCode) 
  {
    this.checkForFolding(newCode);
    this.undoError();
    this.setState({
      code: newCode,
      highlightedLine: null,
      syntaxHelpOpen: false,
      termDefinitionOpen: false,
    });
    this.executeCode();
  }

  checkForFolding(newCode) 
  {
    var x: any = this.refs['cm'];
    if (x) 
    {
      x.findCodeToFold();
    }
  }

  executeCode() 
  {
    var code = this.props.query.mode === 'tql' ? this.state.code : TQLConverter.toTQL(this.props.query)
    this.setState({
      tql: code,
    });
    BuilderActions.setVariantField
      (this.props.query.id,
      'tql',
      code
      );
  }

  changeThemeDefault() 
  {
    localStorage.setItem('theme', 'default');
    this.setState({
      theme: 'default',
      theme_index: 0,
    });
  }

  changeThemeNeo() 
  {
    localStorage.setItem('theme', 'neo');
    this.setState({
      theme: 'neo',
      theme_index: 1,
    });
  }

  changeThemeCobalt() 
  {
    localStorage.setItem('theme', 'cobalt');
    this.setState({
      theme: 'cobalt',
      theme_index: 2,
    });
  }

  changeThemeMonokai() 
  {
    localStorage.setItem('theme', 'monokai');
    this.setState({
      theme: 'monokai',
      theme_index: 3,
    });
  }

  getThemeIndex() 
  {
    switch (this.state.theme) 
    {
      case 'monokai':
        return 3;
      case 'cobalt':
        return 2;
      case 'neo':
        return 1;
      default:
        return 0;
    }
  }

  getMenuOptions(): List<MenuOption> 
  {
    var options: List<MenuOption> =
      List([
        {
          text: 'Default',
          onClick: this.changeThemeDefault,
          disabled: this.getThemeIndex() === 0,
        },
        {
          text: 'Neo',
          onClick: this.changeThemeNeo,
          disabled: this.getThemeIndex() === 1,
        },
        {
          text: 'Cobalt',
          onClick: this.changeThemeCobalt,
          disabled: this.getThemeIndex() === 2,
        },
        {
          text: 'Monokai',
          onClick: this.changeThemeMonokai,
          disabled: this.getThemeIndex() === 3,
        },
      ]);
    return options;
  }

  highlightError(lineNumber: number) 
  {
    var x: any = this.refs['cm'];
    if (x) 
    {
      x.updateHighlightedLine(lineNumber - 1);
      this.setState({
        highlightedLine: lineNumber - 1;
      });
    }
  }

  undoError() 
  {
    if (this.state.highlightedLine != null) 
    {
      var x: any = this.refs['cm'];
      if (x) {
        x.undoHighlightedLine(this.state.highlightedLine);
      }
    }
  }

  componentDidUpdate(prevProps, prevState)   
  {
        //When they switch to tql mode, execute code
     if (prevProps.query.mode !== 'tql' && this.props.query.mode === 'tql')     
     {
            this.executeCode();
     }
     else if (this.props.query.mode !== 'tql' &&
      !(_.isEqual(this.props.query.cards, prevProps.query.cards))) 
     {
      this.executeCode();
    }
  }

  toggleMode() 
  {
    if (this.props.query.mode === 'tql' 
      && this.state.code !== TQLConverter.toTQL(this.props.query))
    {
      this.setState({
        confirmModalMessage: 'Warning: TQL added to the editor will be lost',
      });
      this.toggleConfirmModal();
      return;
    }
    this.switchMode();
  }

  switchMode()
  {
    BuilderActions.setVariantField
      (this.props.query.id, 
        'mode', 
        this.props.query.mode === 'tql' ? 'cards' : 'tql'
      );

    //update when have tql to cards conversion capabilities 
    this.setState({
      code: TQLConverter.toTQL(this.props.query),
    });
  }

  getTopbarClass() 
  {
    switch (this.state.theme) 
    {
      case 'monokai':
        return 'monokai-topbar';
      case 'cobalt':
        return 'cobalt-topbar';

      case 'neo':
        return 'neo-topbar';
      default:
        return 'default-topbar';
    }
  }

  renderTopbar() 
  {
    var currTheme = this.getTopbarClass();
    return (
      <div className={currTheme}>
        <Switch
          first='Cards'
          second='TQL'
          onChange={this.toggleMode}
          selected={this.props.query.mode === 'tql' ? 2 : 1}
          medium={true}
          />
        <div className = 'view-only'>
          {
            this.props.query.mode === 'tql' ? null : "View-only"
          }
        </div>
        <div className='white-space' />
          <div className='tql-editor-manual-popup'>
            <ManualPopup  
              cardName='General'      
              addColumn={this.props.addColumn}
              index={this.props.index}     
            />      
         </div>
        <Menu options={this.getMenuOptions() } small={true}/>
      </div>
    );
  }

  turnSyntaxPopupOff()
  {
    this.setState({
      syntaxHelpOpen: false,
      termDefinitionOpen: false,
    })
  }

  findKeyword(line: string) 
  {
    var keywords = Object.keys(BuilderTypes.cardList);
    var cardName = '';
    keywords.map(function(word) {
      var words = word.split(' ');
      //For terms like select from, only need to match one of the words
      if(words.length > 1)
      {
        for(var i = 0; i < words.length; i++)
        {
          if(line.toLowerCase().indexOf(words[i].toLowerCase()) >= 0)
          {
            cardName = word;
          }
        }
      }
      else if(line.toLowerCase().indexOf(word.toLowerCase()) >= 0)
      {
        cardName = word;
      }
    });
    return cardName;
  }

  toggleSyntaxPopup(event, line)
  {
    var cardName = this.findKeyword(line);

    var left = event.clientX - event.offsetX - 8;
    var top = event.clientY - event.offsetY + 17;
    this.setState({
      syntaxHelpOpen: !this.state.syntaxHelpOpen,
      syntaxHelpPos: {left, top},
      cardName,
      termDefinitionOpen: false,
    });
  }

  defineTerm(value, event)
  {
    var cardName = this.findKeyword(value);
    var left = event.clientX;
    var top = event.clientY - event.offsetY + 22;
    if(cardName)
    {
      this.setState({
        termDefinitionOpen: true,
        termDefinitionPos: {left, top},
        cardName,
        syntaxHelpOpen: false,
      })
    }
  }

  hideTermDefinition()
  {
    this.setState({
      termDefinitionOpen: false,
    })
  }

  renderTqlEditor() 
  {
    var options =
      {
        readOnly: (this.props.query.mode === 'tql' ? false : true),
        lineNumbers: true,
        mode: 'tql',
        extraKeys: { 'Ctrl-F': 'findPersistent' },
        lineWrapping: true,
        theme: this.state.theme,
        matchBrackets: true,
        autoCloseBrackets: true,
        foldGutter: true,
        lint: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
      };
    var value = this.props.query.mode === 'tql' ? this.state.code : TQLConverter.toTQL(this.props.query);
    return <CodeMirror
      highlightedLine={this.state.highlightedLine}
      onChange={this.updateCode}
      ref="cm"
      options={options}
      className='codemirror-text'
      value={value}
      toggleSyntaxPopup={this.toggleSyntaxPopup}
      defineTerm={this.defineTerm}
      turnSyntaxPopupOff={this.turnSyntaxPopupOff}
      hideTermDefinition={this.hideTermDefinition}
      />
  }

  renderResults() 
  {
    return <ResultsView
      tql={this.state.tql}
      onError={this.highlightError}
      onLoadStart={this.props.onLoadStart}
      onLoadEnd={this.props.onLoadEnd}
    />
  }

  toggleConfirmModal()
  {
    this.setState ({
       confirmModalOpen: !this.state.confirmModalOpen,
    });
  }

  render() 
  {
    var manualEntry = BuilderTypes.cardList[this.state.cardName] &&
        BuilderTypes.Blocks[BuilderTypes.cardList[this.state.cardName]].static.manualEntry;
    return (
      <div className='tql-column'>
        { this.renderTopbar() }
        <div className='code-section'>
          { this.renderTqlEditor() }
          { this.state.syntaxHelpOpen ? 
            <TQLPopup 
               cardName={this.state.cardName}
               text={manualEntry ? manualEntry.syntax : 'No syntax help available'}
               style={this.state.syntaxHelpPos}
               addColumn={this.props.addColumn}
               index={this.props.index}
               onClick={this.turnSyntaxPopupOff}  
            />
            : null
          }
          {
            this.state.termDefinitionOpen ? 
            <TQLPopup 
              cardName={this.state.cardName}
              text={manualEntry ? manualEntry.summary : 'No definition available'}
               style={this.state.termDefinitionPos}
               addColumn={this.props.addColumn}
               index={this.props.index}  
               onClick={this.turnSyntaxPopupOff}  
            />
            : null
          }
          { this.renderResults() }
        </div>
        <Modal 
          message={this.state.confirmModalMessage}
          onClose={this.toggleConfirmModal} 
          open={this.state.confirmModalOpen} 
          confirm={true}
          onConfirm = {this.switchMode} 
        /> 
      </div>
    );
  }
}

export default TQL;