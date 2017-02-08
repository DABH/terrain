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

require('./LibraryVariantInfo.less');
import * as React from 'react';
import * as Immutable from 'immutable';
const {List} = Immutable;
import Ajax from './../../util/Ajax.tsx';
import PureClasss from './../../common/components/PureClasss.tsx';
import VariantVersions from './VariantVersions.tsx';
import LibraryTypes from './../LibraryTypes.tsx';
import Menu from './../../common/components/Menu.tsx';
import Dropdown from './../../common/components/Dropdown.tsx';
import Actions from './../data/LibraryActions.tsx';
import UserThumbnail from './../../users/components/UserThumbnail.tsx';
import UserStore from './../../users/data/UserStore.tsx';
import RolesStore from './../../roles/data/RolesStore.tsx';
import LibraryActions from './../data/LibraryActions.tsx';
import Util from './../../util/Util.tsx';
import StatusDropdown from './StatusDropdown.tsx';

type Variant = LibraryTypes.Variant;

interface Props
{
  variant: Variant;
  dbs: List<string>;
  isAdmin: boolean;
  isBuilder: boolean;
}

class LibraryInfoColumn extends PureClasss<Props>
{
  handleDbChange(dbIndex:number)
  {
    Actions.variants.change(this.props.variant.set('db', this.props.dbs.get(dbIndex)) as Variant);
  }
  
  render()
  {
    if(!this.props.variant)
    {
      return null;
    }
    
    let {isBuilder, isAdmin} = this.props;
    let {variant} = this.props;
    
    return (
      <div
        className='library-info-variant'
      >
        <div className='biv-table-wrapper'>
          <div
            className='biv-table'
          >
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Status
              </div>
              <div className='biv-cell-second'>
                <StatusDropdown
                  variant={this.props.variant}
                />
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Database
              </div>
              <div className='biv-cell-second'>
                <Dropdown
                  selectedIndex={this.props.dbs && this.props.dbs.indexOf(this.props.variant.db)}
                  options={this.props.dbs}
                  onChange={this.handleDbChange}
                  canEdit={isBuilder || isAdmin}
                  className='bic-db-dropdown'
                />
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Updated At
              </div>
              <div className='biv-cell-second'>
                {
                  Util.formatDate(variant.lastEdited)
                }
              </div>
            </div>
            <div className='biv-row'>
              <div className='biv-cell-first'>
                Updated By
              </div>
              <div className='biv-cell-second'>
                <UserThumbnail
                  username={variant.lastUsername}
                  smallest={true}
                  showName={true}
                  link={true}
                />
              </div>
            </div>
          </div>
        </div>
        
        <VariantVersions 
          variant={this.props.variant} 
        />
      </div>
    );
  }
}


export default LibraryInfoColumn;