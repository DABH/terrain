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

import * as Immutable from 'immutable';
import * as React from 'react';
import * as _ from 'underscore';
const {List} = Immutable;
import Classs from './../../common/components/Classs';
import Dropdown from './../../common/components/Dropdown';
import InfoArea from './../../common/components/InfoArea';
import RolesStore from './../../roles/data/RolesStore';
import RoleTypes from './../../roles/RoleTypes';
import UserStore from './../../users/data/UserStore';
import UserTypes from './../../users/UserTypes';
import Ajax from './../../util/Ajax';
import ColorManager from './../../util/ColorManager';
import Util from './../../util/Util';
import LibraryActions from './../data/LibraryActions';
import Actions from './../data/LibraryActions';
import LibraryStore from './../data/LibraryStore';
import LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import './LibraryInfoColumn.less';
import LibraryInfoUser from './LibraryInfoUser';
import LibraryVariantInfo from './LibraryVariantInfo';

const AlgorithmIcon = require('./../../../images/icon_badgeAlgorithm.svg');
const GroupIcon = require('./../../../images/icon_badgeGroup.svg');
const VariantIcon = require('./../../../images/icon_badgeVariant.svg');

type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;

type Role = RoleTypes.Role;
type RoleMap = RoleTypes.RoleMap;
type User = UserTypes.User;
type UserMap = UserTypes.UserMap;

export interface Props
{
  group: Group;
  algorithm: Algorithm;
  variant: Variant;
}

class LibraryInfoColumn extends Classs<Props>
{
  public state: {
    users: UserMap,
    roles: RoleMap,
    me: User,
    dbs: List<LibraryTypes.Database>,
  } = {
    users: null,
    roles: null,
    me: null,
    dbs: List([]),
  };

  constructor(props: Props)
  {
    super(props);

    this._subscribe(UserStore, {
      stateKey: 'users',
      storeKeyPath: ['users'],
    });
    this._subscribe(UserStore, {
      stateKey: 'me',
      storeKeyPath: ['currentUser'],
    });
    this._subscribe(RolesStore, {
      stateKey: 'roles',
    });

    this._subscribe(LibraryStore, {
      stateKey: 'dbs',
      storeKeyPath: ['dbs'],
    });

    Ajax.getDbs((dbs: LibraryTypes.Database[]) =>
    {
      LibraryActions.setDbs(
        List(dbs),
      );
    });
  }

  public renderVariant(isSuperUser, isBuilder)
  {
    return (
      <LibraryVariantInfo
        variant={this.props.variant}
        isSuperUser={isSuperUser}
        isBuilder={isBuilder}
        dbs={this.state.dbs}
      />
    );
  }

  public handleAlgorithmDbChange(dbIndex: number)
  {
    Actions.algorithms.change(this.props.algorithm.set('db', this.state.dbs.get(dbIndex)) as Algorithm);
  }

  public renderAlgorithm(isSuperUser, isBuilder)
  {
    if (! this.props.algorithm || this.props.variant)
    {
      return null;
    }

    return (
      <div>
        <div className="library-info-line">
          <div>
          Default Database
          </div>
          <Dropdown
            selectedIndex={this.state.dbs && this.state.dbs.findIndex(
              db => db.id === this.props.algorithm.db
            )}
            options={this.state.dbs.map(db => db.name + ' (' + db.type + ')').toList()}
            onChange={this.handleAlgorithmDbChange}
            canEdit={isBuilder || isSuperUser}
            className="bic-db-dropdown"
          />
        </div>
      </div>
    );
  }

  public renderUser(user: User): JSX.Element
  {
    const {roles} = this.state;
    const groupRoles = roles && roles.get(this.props.group.id);
    if (!user || user.isDisabled)
    {
      return null;
    }
    return <LibraryInfoUser
      user={user}
      groupRoles={groupRoles}
      me={this.state.me}
      groupId={this.props.group.id}
      key={user.id}
    />;
  }

  public renderGroupRoles(): JSX.Element | JSX.Element[]
  {
    const { me, users, roles } = this.state;
    const groupRoles = roles && roles.get(this.props.group.id);
    if (!me || !groupRoles || !users)
    {
      return null;
    }

    return groupRoles.toArray().map((role: Role) =>
      {
        if (role.userId === me.id)
        {
          return null; // current user is always rendered at top
        }
        return this.renderUser(users.get(role.userId));
      });
  }

  public renderRemainingUsers()
  {
    const { me, roles, users } = this.state;
    const groupRoles = roles && roles.get(this.props.group.id);
    if (!me || !users)
    {
      return null;
    }

    return users.toArray().map((user: User) =>
      {
        if (user.id === me.id || (groupRoles && groupRoles.get(user.id)))
        {
          return null; // current user and existing roles are rendered at top
        }
        return this.renderUser(user);
      });
  }

  public handleGroupDbChange(dbIndex: number)
  {
    Actions.groups.change(this.props.group.set('db', this.state.dbs.get(dbIndex)) as Group);
  }

  public renderGroup(isSuperUser, isBuilder)
  {
    const { group } = this.props;
    if (!group || this.props.algorithm || this.props.variant)
    {
      return null;
    }

    // let users: UserTypes.UserMap = UserStore.getState().get('users');
    // let me: UserTypes.User = UserStore.getState().get('currentUser');
    // let groupRoles: GroupRoleMap = RolesStore.getState().getIn(['roles', group.id]);

    const isSysAdmin = this.state.me && this.state.me.isSuperUser;

    return (
      <div>
        <div className="library-info-line">
          <div>
            Default Database
          </div>
          <Dropdown
            selectedIndex={this.state.dbs && this.state.dbs.findIndex(
              db => db.id === this.props.group.db
            )}
            options={this.state.dbs.map(db => db.name).toList()}
            onChange={this.handleGroupDbChange}
            canEdit={isBuilder || isSuperUser}
            className="bic-db-dropdown"
          />
        </div>
        <div className="library-info-users">
          { this.renderUser(this.state.me) }
          { this.renderGroupRoles() }
          { this.renderRemainingUsers() }
        </div>
      </div>
    );
  }

  public render()
  {
    const item: LibraryTypes.Variant | LibraryTypes.Algorithm | LibraryTypes.Group =
      this.props.variant || this.props.algorithm || this.props.group;

    let groupId: ID;
    let opacity: number;
    let icon: any;

    switch (item && item.type)
    {
      case 'GROUP':
        groupId = item.id;
        opacity = 1;
        icon = <GroupIcon />;
        break;
      case 'ALGORITHM':
        groupId = item['groupId'];
        opacity = 0.75;
        icon = <AlgorithmIcon />;
        break;
      case 'VARIANT':
        groupId = item['groupId'];
        opacity = 0.5;
        icon = <VariantIcon />;
        break;
      default:
        break;
    }

    const isSuperUser = Util.haveRole(groupId, 'admin', UserStore, RolesStore);
    const isBuilder = Util.haveRole(groupId, 'builder', UserStore, RolesStore);

    return (
      <LibraryColumn
        index={4}
        title={null}
      >
        {
          item ?
            <div className="library-info">
              <div
                className="library-info-image"
              >
                <style
                  dangerouslySetInnerHTML={{ __html: '.library-info-image #Color { \
                    fill: ' + ColorManager.colorForKey(groupId) + ' !important; \
                  }'}}
                />
                {
                  icon
                }
              </div>
              <div className="library-info-name">
                {
                  item.name
                }
              </div>
              <div className="library-info-type">
                {
                  item.type
                }
              </div>
              {
                this.renderVariant(isSuperUser, isBuilder)
              }
              {
                this.renderAlgorithm(isSuperUser, isBuilder)
              }
              {
                this.renderGroup(isSuperUser, isBuilder)
              }
            </div>
          :
            <div className="library-info">
              <InfoArea
                large="Select a Group"
              />
            </div>

        }
      </LibraryColumn>
    );
  }
}

export default LibraryInfoColumn;
