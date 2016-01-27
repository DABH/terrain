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

require('./CreateCardTool.less')
import * as React from 'react';
import Actions from "../../data/Actions.tsx";
import Util from '../../util/Util.tsx';
import { CardTypes } from './../../CommonVars.tsx';

var AddIcon = require("./../../../images/icon_add_7x7.svg?name=AddIcon");
var CloseIcon = require("./../../../images/icon_close_8x8.svg?name=CloseIcon");

interface Props {
  index: number;
  alwaysOpen?: boolean;
}

class CreateCardTool extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    this.state = {
      open: false
    };
    this.toggleOpen = this.toggleOpen.bind(this);
  }
  
  createCardFactory(type: string): () => void {
    return () => {
      Actions.dispatch.cards.create(type, this.props.index);
    }
  }
  
  toggleOpen() {
    this.setState({
      open: !this.state.open,
    });
  }
  
  renderCardSelector() {
    return (
     <div className="create-card-selector" onClick={this.toggleOpen}>
       {
         CardTypes.map((type) => (
           <div className="create-card-button" key={type} onClick={this.createCardFactory(type)}>
             { type }
           </div>
         ))
       }
     </div>
     );
  }
  
  renderCreateCardRow() {
    return (
     <div className="create-card-row">
       <div className="create-card-line"></div>
       <div className="create-card-plus">
         { this.state.open ? <CloseIcon /> : <AddIcon /> }
       </div>
     </div>
     );
  }

  render() {
    var classes = Util.objToClassname({
      "create-card-wrapper": true,
      "create-card-open": this.state.open || this.props.alwaysOpen,
      "create-card-closed": !this.state.open && !this.props.alwaysOpen,
    });
    
    return (
      <div className={classes} onClick={this.toggleOpen}>
        { this.renderCreateCardRow() }
        { this.renderCardSelector() }
     </div>
   );
  }
};

export default CreateCardTool;