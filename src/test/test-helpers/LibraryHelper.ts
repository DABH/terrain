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

// Copyright 2017 Terrain Data, Inc.
// tslint:disable:max-classes-per-file
import * as Immutable from 'immutable';
import
{
  _Algorithm,
  _Category,
  _Group,
  _LibraryState,
  Algorithm,
  Category,
  Group,
} from 'library/LibraryTypes';
import { ItemType } from '../../items/types/Item';

export default class LibraryHelper
{
  public static mockState()
  {
    return new LibraryStateMock();
  }

  public static mockCategory()
  {
    return _Category();
  }
}

class LibraryStateMock
{
  public state;

  public constructor()
  {
    this.state = _LibraryState({
      categories: Immutable.Map<number, Category>({}),
      groups: Immutable.Map<number, Group>({}),
      algorithms: Immutable.Map<number, Algorithm>({}),
    });
  }

  public addCategory(id: number, categoryName: string)
  {
    const category = _Category({
      type: ItemType.Category,
      id,
      name: categoryName,
      lastEdited: '',
      lastUserId: '',
      userIds: Immutable.List([]),
      defaultLanguage: 'elastic',
      parent: 0,
      modelVersion: 5,
    });

    this.state = this.state.set(
      'categories',
      this.state.categories.set(id, category),
    );

    return this;
  }

  public addGroup(categoryId: number, groupId: number, groupName: string)
  {
    const group = _Group({
      id: groupId,
      name: 'Group 1',
      lastEdited: '',
      lastUserId: '',
      userIds: Immutable.List([]),
      defaultLanguage: 'elastic',
      parent: 0,
      modelVersion: 5,
      categoryId,
    });

    this.state = this.state
      .setIn(['groups', groupId], group)
      .setIn(
        ['categories', categoryId, 'groupsOrder'],
        this.state.categories.get(categoryId).groupsOrder.push(groupId),
      );

    return this;
  }

  public addAlgorithm(groupId: number, algorithmId: number, algorithmName: string)
  {
    const algorithm = _Algorithm({
      id: algorithmId,
      name: algorithmName,
      modelVersion: 5,
      groupId,
    });

    this.state = this.state
      .setIn(['algorithms', algorithmId], algorithm)
      .setIn(
        ['groups', groupId, 'algorithmsOrder'],
        this.state.groups.get(groupId).algorithmsOrder.push(algorithmId),
      );

    return this;
  }

  public getState()
  {
    return this.state;
  }
}
