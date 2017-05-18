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

import * as Immutable from 'immutable';
import RoleTypes from './../roles/RoleTypes';
import {BaseClass, New} from '../Classes';

export module UserTypes
{
  class UserC extends BaseClass
  {
    // db-level fields
    isSuperUser = false;
    isDisabled = false;
    email = '';

    // metadata fields
    name = '';
    whatIDo = '';
    skype = '';
    timeZone = 158;
    phone = '';
    imgSrc = '';
    tutorialStepsCompleted: IMMap<string, boolean> = Immutable.Map<string, boolean>({});

    //notifications fields
    sound = 'chime';
    emailNotificationType = 'Activities of any kind';
    emailNotificationTiming = 'Once every 15 minutes';
    desktopNotificationType = 'Activities of any kind';
    emailNews = 'on';

    // DB level fields
    dbFields = [
      'id',
      'email',
      'isDisabled',
      'isSuperUser',
      'name',
      'oldPassword',
      'password',
      'timezone',
    ];

    // "static" fields to exclude
    excludeFields = ['dbFields', 'excludeFields'];

    // groupRoles: Immutable.Map({}),
  }
  export type User = UserC & IRecord<UserC>;
  export const _User = (config: {[key:string]: any} = {}) => 
  {
    config.tutorialStepsCompleted = Immutable.Map(config.tutorialStepsCompleted);
    return New<User>(new UserC(config), config);
  };

  export type UserMap = Immutable.Map<ID, UserTypes.User>;

  class UserStateC extends BaseClass
  {
    loading = false;
    loaded = false;
    users = Immutable.Map<ID, User>({});
    currentUser: UserTypes.User = null;
  }
  export type UserState = UserStateC & IRecord<UserStateC>;
  export const _UserState = (config?: {[key:string]: any}) => 
    New<UserState>(new UserStateC(config), config);

  export function profileUrlFor(user: User): string
  {
    if (user && user.imgSrc)
    {
      return user.imgSrc;
    }
    
    let index: number = 0;
    if (user)
    {
      if (typeof user.id === 'string')
      {
        index = (user.id.charCodeAt(0) % numProfileImages) + 1;
      }
      if (typeof user.id === 'number')
      {
        index = (user.id % numProfileImages) + 1;
      }
    }
    
    return '/dist/profiles/profile' + index + '.jpg';
  }
}

const numProfileImages = 9;

export default UserTypes;
