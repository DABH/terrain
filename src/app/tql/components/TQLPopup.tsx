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

import * as $ from 'jquery';
import * as _ from 'underscore';
import * as React from 'react';
import Util from '../../util/Util.tsx';
import * as classNames from 'classnames';
import Classs from './../../common/components/Classs.tsx';

var Manual = require('./../../manual/ManualConfig.json');
var OpenIcon = require('./../../../images/icon_open.svg');

interface Props
{
  text: string;
  history?: any;
  style?: any;
  addColumn?: (number) => void;
  canAddColumn?: boolean;
  onCloseColumn?: (number) => void;
  index?: number;
}

class TQLPopup extends Classs<Props>
{
  constructor(props: Props) {
    super(props);
    this.addColumn = _.debounce(this.addColumn, 50);
  }

  addColumn()
  {
    this.props.addColumn(0);
  }

  closeColumn()
  {
    var closeIndex;
    if (this.props.index === 0 || this.props.index === 1)
    {
      closeIndex = 2;
    }
    else {
      closeIndex = 1;
    }
    this.props.onCloseColumn(closeIndex);
    this.addColumn();
  }

  openManual()
  {
    this.props.canAddColumn ?  this.props.addColumn(0) : this.closeColumn();
  }

  render() {
    return (
      <div 
        className='tql-editor-syntax-help'
        style={this.props.style}
      >
        {this.props.text}      
        <div 
          className='manual-popup-link'
          onClick={this.openManual}
        >
            See full description in Manual
          <OpenIcon 
            className='manual-popup-open-icon' 
            onClick={this.openManual}
          />
        </div>  
      </div>     
    );
  }
};

export default TQLPopup;
