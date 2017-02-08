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
import * as Immutable from 'immutable';
import * as ReduxActions from 'redux-actions';
var Redux = require('redux');

import AuthStore from './../../auth/data/AuthStore.tsx';
import UserStore from './../../users/data/UserStore.tsx';
import RoleStore from './../../roles/data/RolesStore.tsx';
import Actions from "./LibraryActions.tsx";
import {LibraryActionTypes, CleanLibraryActionTypes} from './LibraryActionTypes.tsx';
import LibraryTypes from './../LibraryTypes.tsx';
type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;
import Util from './../../util/Util.tsx';
import BuilderActions from '../../builder/data/BuilderActions.tsx';

import Ajax from './../../util/Ajax.tsx';

class LibraryStateC
{
  loaded = false;
  loading = true;
  dbs: List<string> = Immutable.List([]);
  
  groups: Map<ID, Group> = null;
  algorithms: Map<ID, Algorithm> = null;
  variants: Map<ID, Variant> = null;
  
  // these are set these on initial load
  prevGroups: Map<ID, Group> = null;
  prevAlgorithms: Map<ID, Algorithm> = null;
  prevVariants: Map<ID, Variant> = null;
  
  groupsOrder: List<ID> = Immutable.List([]);
  
  changingStatus: boolean = false;
  changingStatusOf: LibraryTypes.Variant = null;
  changingStatusTo: LibraryTypes.EVariantStatus = 0;
  changingStatusDefault: boolean = false;
}
const LibraryState_Record = Immutable.Record(new LibraryStateC());
export interface LibraryState extends LibraryStateC, IRecord<LibraryState> {}
export const _LibraryState = (config?:any) => {
  return new LibraryState_Record(Util.extendId(config || {})) as any as LibraryState;
}

var DefaultState = _LibraryState();

import LibraryReducers from './LibraryReducers.tsx';

function saveStateOf(current: Map<ID, any>, previous: Map<ID, any>)
{
  if(current !== previous)
  {
    current && previous && current.map((curItem: any, curId: ID) =>
    {
      let prevItem = previous.get(curId);
      if(curItem !== prevItem)
      {
        // should save
        Ajax.saveItem(curItem);
      }
    });
  }
}

export const LibraryStore: IStore<LibraryState> = Redux.createStore(
  (state: LibraryState = DefaultState, action) =>
  {
    if(LibraryReducers[action.type])
    {
      state = LibraryReducers[action.type](state, action);
    }
    
    if(CleanLibraryActionTypes.indexOf(action.type) === -1)
    {
      // save the new state
      saveStateOf(state.groups, state.prevGroups);
      saveStateOf(state.algorithms, state.prevAlgorithms);
      saveStateOf(state.variants, state.prevVariants);
    }
    
    state = state
      .set('prevGroups', state.groups)
      .set('prevAlgorithms', state.algorithms)
      .set('prevVariants', state.variants);
    
    return state;
  }
, DefaultState);


export default LibraryStore;