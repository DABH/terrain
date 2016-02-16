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

require('./Result.less');
import * as $ from 'jquery';
import * as React from 'react';
import Util from '../../util/Util.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';

var fields = 
[
  'id',
  'minPrice',
  'numJobs',
  'avgRating',
  'averageResponseTime',
  'location',
  'description',
];

var Result = React.createClass<any, any>({
	mixins: [PanelMixin],
  
  getInitialState() {
    return {
      score: Math.random(),
      openFields: [],
    }
  },

	propTypes:
	{
		data: React.PropTypes.object.isRequired,
		parentNode: React.PropTypes.object,
	},

	getDefaultProps() 
	{
		return {
			drag_x: true,
			drag_y: true,
			reorderOnDrag: true,
			dragInsideOnly: true,
		};
	},
  
  toggleField(event) {
    var field = $(event.target).attr('rel');
    if(this.state.openFields.indexOf(field) === -1)
    {
      this.setState({
        openFields: this.state.openFields.concat([field]),
      });
    }
    else
    {
      this.state.openFields.splice(this.state.openFields.indexOf(field), 1);
      this.setState({
        openFields: this.state.openFields,
      });
    }
  },
  
  renderField(field, index)
  {
    if(index > 3)
    {
      return null;
    }
    
    return (
      <div className="result-field" key={field}>
        <div className="result-field-name">
          { field }
        </div>
        <div
          className={'result-field-value ' + ((field + this.props.data[field]).length < 15 ? 'result-field-value-short' : '')}
          >
          { this.props.data[field] }
        </div>
      </div>
    );
  },

	render() {
		return this.renderPanel((
			<div className='result'>
				<div className='result-inner'>
					<div className='result-name'>
						{this.props.data.name}
					</div>
					<div className='result-score'>
            Final Score
            <div className='result-score-score'>
              { Math.floor(this.state.score * 100) / 100 }
            </div>
					</div>
          <div className='result-fields-wrapper'>
            { fields.map(this.renderField) }
          </div>
				</div>
			</div>
			));
	},
});

export default Result;