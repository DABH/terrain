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

require('./Dropdown.less');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../../util/Util.tsx';

interface Props
{
  onChange: (index: number) => void;
  selectedIndex: number;
  ref?: string;
  options: string[];
  circle?: boolean;
}

class Dropdown extends React.Component<Props, any>
{
  value: number;
  
  constructor(props: Props) {
    super(props);
    this.renderOption = this.renderOption.bind(this);
    this.computeDirection = this.computeDirection.bind(this);
    this.value = this.props.selectedIndex;
    this.state = {
      up: false,
    };
  }
  
  renderOption(option, index)
  {
    if(index === this.props.selectedIndex)
    {
      return null;
    }
    
    var handleClick = () => {
      this.value = index;
      this.props.onChange(index);
    }
    return (
      <div className="dropdown-option" key={index} onClick={handleClick}>
        <div className="dropdown-option-inner">
          { option }
        </div>
      </div>
    );
  }
  
  computeDirection() {
    var cr = ReactDOM.findDOMNode(this).getBoundingClientRect();
    if(this.state.up)
    {
      var componentBottom = cr.bottom + cr.height;
    }
    else
    {
      var componentBottom = cr.bottom;
    }
    var windowBottom = window.innerHeight;
    
    if(componentBottom > windowBottom)
    {
      this.setState({
        up: true,
      });
    }
    else
    {
      this.setState({
        up: false,
      })
    }
  }
  
  componentDidMount() {
    this.computeDirection();
  }
  
  render() {
    var classes = Util.objToClassname({
      "dropdown-wrapper": true,
      "dropdown-wrapper-circle": this.props.circle,
      "dropdown-up": this.state.up,
    });
    
    return (
      <div className={classes}>
        { this.state.up ? (
          <div className="dropdown-options-wrapper">
            {
              this.props.options.map(this.renderOption)
            }
          </div>
        ) : null }
        <div className="dropdown-value" onMouseEnter={this.computeDirection}>
          <div className="dropdown-option-inner">
            { this.props.options[this.props.selectedIndex] }
          </div>
        </div>
        { !this.state.up ? (
          <div className="dropdown-options-wrapper">
            {
              this.props.options.map(this.renderOption)
            }
          </div>
        ) : null }
      </div>
    );
  }
};

export default Dropdown;