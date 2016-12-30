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

require('./Library.less');
import * as React from 'react';
import PureClasss from './../../common/components/PureClasss.tsx';
import Store from './../data/LibraryStore.tsx';
import {LibraryState} from './../data/LibraryStore.tsx';
import Actions from './../data/LibraryActions.tsx';
import RolesActions from './../../roles/data/RolesActions.tsx';
import UserActions from './../../users/data/UserActions.tsx';
import LibraryTypes from './../LibraryTypes.tsx';
import GroupsColumn from './GroupsColumn.tsx';
import AlgorithmsColumn from './AlgorithmsColumn.tsx';
import VariantsColumn from './VariantsColumn.tsx';
import LibraryInfoColumn from './LibraryInfoColumn.tsx';
import { DragDropContext } from 'react-dnd';
import InfoArea from './../../common/components/InfoArea.tsx';
import Loading from './../../common/components/Loading.tsx';
var HTML5Backend = require('react-dnd-html5-backend');
const {browserHistory} = require('react-router');

interface Props
{
  params?: any;
  location?: {
    pathname: string;
  };
}

class Library extends PureClasss<Props>
{
  cancelSubscription = null;
  
  state: {
    libraryState: LibraryState;
    loadFinished: boolean;
  } = {
    libraryState: null,
    loadFinished: false,
  };
  
  constructor(props)
  {
    super(props);
    
    this.state.libraryState = Store.getState();
    this.state.loadFinished = !this.state.libraryState.loading;
  }
  
  componentWillMount()
  {
    if(!this.props.params.groupId)
    {
      // no path given, redirect to last library path
      let path = localStorage.getItem('lastLibraryPath');
      if(path)
      {
        browserHistory.replace(path);
      }
    }
  }
  
  componentDidMount()
  {
    this._subscribe(Store, {
      stateKey: 'libraryState',
      isMounted: true,
    })
      
    Actions.fetch();
    RolesActions.fetch();
    UserActions.fetch();
  }
  
  handleLoadedEnd()
  {
    this.setState({
      loadFinished: true,
    });
  }
  
  render()
  {
    const {libraryState} = this.state;
    
    if(!this.state.loadFinished)
    {
      return (
        <Loading
          width={100}
          height={100}
          loading={true}
          loaded={!libraryState.loading}
          onLoadedEnd={this.handleLoadedEnd}
          center={true}
        />
      );
    }
    
    const { groups, algorithms, variants, groupsOrder } = libraryState;
    const { groupId, algorithmId, variantId } = this.props.params;
    
    if(groupId)
    {
      var group = libraryState.getIn(['groups', groupId]) as LibraryTypes.Group;
      
      if(group)
      {
        var { algorithmsOrder } = group;
        
        if(algorithmId)
        {
          var algorithm = algorithms.get(algorithmId);
          
          if(algorithm)
          {
            var { variantsOrder } = algorithm;
            
            if(variantId)
            {
              var variant = variants.get(variantId);
              
              if(!variant)
              {
                browserHistory.replace(`/library/${groupId}/${algorithmId}`);    
              }
            }
          } else {
            // !algorithm
            browserHistory.replace(`/library/${groupId}`);
          }
        }
      } else {
        // !group
        browserHistory.replace('/library');
      }
    }
    
    localStorage.setItem('lastLibraryPath', this.props.location.pathname);
    
    return (
      <div className='library'>
        <GroupsColumn
          {...{
            groups,
            groupsOrder,
          }}
        />
        <AlgorithmsColumn
          {...{
            algorithms,
            variants,
            algorithmsOrder,
            groupId
          }}
        />
        <VariantsColumn
          {...{
            variants,
            variantsOrder,
            groupId,
            algorithmId,
          }}
        />
        <LibraryInfoColumn
          {...{
            group,
            algorithm,
            variant,
          }}
        />
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(Library);