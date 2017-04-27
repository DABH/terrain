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

require('./Profile.less');
import * as classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router';
import AuthStore from './../../auth/data/AuthStore';
import Classs from './../../common/components/Classs';
import InfoArea from './../../common/components/InfoArea';
import Ajax from './../../util/Ajax';
import Actions from './../data/UserActions';
import UserStore from './../data/UserStore';
import UserTypes from './../UserTypes';
import LibraryTypes from './../UserTypes';

export interface Props
{
  params?: any;
  history?: any;
  children?: any;
}

class Profile extends Classs<Props>
{
  userUnsubscribe = null;
  authUnsubscribe = null;

  state: {
    user: UserTypes.User,
    me: UserTypes.User,
    loading: boolean,
    isLoggedInUser: boolean,
    routeIsDirect: boolean,
  } = {
    user: null,
    me: null,
    loading: false,
    isLoggedInUser: false,
    routeIsDirect: false,
  };

  infoKeys = [
    'username',
    'whatIDo',
    'phone',
    'skype',
  ];

  constructor(props: Props)
  {
    super(props);

    this._subscribe(UserStore, {
      stateKey: 'me',
      storeKeyPath: ['currentUser'],
    });
  }

  updateUser(props: Props)
  {
    const userState: UserTypes.UserState = UserStore.getState();
    const authState = AuthStore.getState();
    let username = authState.get('username');
    const routeUsername = this.props.params.username;
    let isLoggedInUser = true;
    let routeIsDirect = false;

    if (routeUsername && routeUsername.length)
    {
      isLoggedInUser = routeUsername === username;
      username = routeUsername;
      routeIsDirect = true;
    }

    this.setState({
      user: userState.getIn(['users', username]),
      loading: userState.get('loading'),
      isLoggedInUser,
      routeIsDirect,
    });
  }

  componentDidMount()
  {
    Actions.fetch();
    this.updateUser(this.props);

    this.userUnsubscribe =
      UserStore.subscribe(() => this.updateUser(this.props));
    this.authUnsubscribe =
      AuthStore.subscribe(() => this.updateUser(this.props));
  }

  componentWillUnmount()
  {
    this.userUnsubscribe && this.userUnsubscribe();
    this.authUnsubscribe && this.authUnsubscribe();
  }

  renderInfoItem(key: string)
  {
    return (
      <div className="profile-info-item" key={key}>
        <div className="profile-info-item-name">
          { key.replace(/([A-Z])/g, (v) => ' ' + v) }
        </div>
        <div className="profile-info-item-value">
          { this.state.user[key] }
        </div>
      </div>
    );
  }

  toggleAdmin()
  {
    if (window.confirm(
      this.state.user.isAdmin ?
        'Are you sure you want to revoke this user\'s administrative privileges?'
      :
      'Are you sure you want to make this user a system-level administrator? \
The user will be able to create new user accounts, create new groups, \
disable existing users, add new system administrators, and revoke \
any existing system administrator privileges, including your own. \
(You can revoke their administator privileges later, as long as you \
are still a system administrator yourself.)'))
    {
      const user = this.state.user.set('isAdmin', !this.state.user.isAdmin) as UserTypes.User;
      Actions.change(user);
      Ajax.adminSaveUser(user);
    }
  }

  toggleDisabled()
  {
    if (window.confirm(this.state.user.isDisabled ?
      'Are you sure you want to re-enable this user? They will be able to log in to Terraformer again.'
      :
      'Are you sure you want to disable this user? \
The user will not be able to log in to Terraformer, nor will they \
be able to view any information or make any changes. They will \
immediately be logged out of any existing sessions. \
(You can re-enable this user later, if needed.)'))
    {
      const user = this.state.user.set('isDisabled', !this.state.user.isDisabled) as UserTypes.User;
      Actions.change(user);
      Ajax.adminSaveUser(user);
    }
  }

  renderAdminTools()
  {
    const {me, user} = this.state;
    if (!me || !me.isAdmin || me.username === user.username)
    {
      return null;
    }

    return (
      <div className="profile-admin-tools">
        <div
          className={classNames({
            'profile-admin-button': true,
            'profile-admin-button-red': user.isAdmin,
          })}
          onClick={this.toggleAdmin}
        >
          { user.isAdmin ? 'Revoke System Administratorship' : 'Make System Administrator' }
        </div>
        <div
          className={classNames({
            'profile-admin-button': true,
            'profile-admin-button-red': !user.isDisabled,
          })}
          onClick={this.toggleDisabled}
        >
          { user.isDisabled ? 'Re-Enable User' : 'Disable User' }
        </div>
      </div>
    );
  }

  render()
  {
    if (this.state.loading)
    {
      return <InfoArea large="Loading..." />;
    }

    if (!this.state.user)
    {
      return <InfoArea large="No such user found." />;
    }

    return (
      <div className={classNames({
        'profile': true,
        'profile-wrapper': this.state.routeIsDirect,
      })}>
        <div
          className="profile-pic"
        >
          <img
            className="profile-pic-image"
            src={UserTypes.profileUrlFor(this.state.user)}
            ref="profilePicImg"
          />
        </div>
        <div className="profile-name">
          { this.state.user.name() }
          { this.state.user.isDisabled ? <b><br />Disabled</b> : null }
        </div>
        {
          this.state.isLoggedInUser ?
            <div className="profile-edit-row">
              <Link to="/account/profile/edit" className="button">
                Edit
              </Link>
            </div>
          : null
        }
        <div className="profile-info">
          {
            this.infoKeys.map(this.renderInfoItem)
          }
        </div>
        { this.renderAdminTools() }
        <Link to="/account/team" className="profile-team-button">
          Team Directory
        </Link>
      </div>
    );
  }
}

export default Profile;
