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

import * as React from 'react';
import { Link } from 'react-router';
import Classs from './../../common/components/Classs.tsx';
import UserStore from './../data/UserStore.tsx';
import Actions from './../data/UserActions.tsx';
import BrowserTypes from './../UserTypes.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import UserTypes from './../UserTypes.tsx';
import AuthStore from './../../auth/data/AuthStore.tsx';
import Ajax from './../../util/Ajax.tsx';

interface Props
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
    loading: boolean,
  } = {
    user: null,
    loading: false,
  };
  
  infoKeys = [
    'username',
    'whatIDo',
    'timezone',
    'phone',
    'email',
    'skype',
  ];
  
  constructor(props:Props)
  {
    super(props);
    
    this.userUnsubscribe = 
      UserStore.subscribe(() => this.updateUser(this.props));
    this.authUnsubscribe = 
      AuthStore.subscribe(() => this.updateUser(this.props));
  }
  
  updateUser(props:Props)
  {
    let userState:UserTypes.UserState = UserStore.getState();
    let authState = AuthStore.getState();
    this.setState({
      user: userState.getIn(['users', authState.get('username')]),
      loading: userState.get('loading'),
    })
  }
  
  componentWillMount()
  {
    Actions.fetch();
    this.updateUser(this.props);
  }
  
  componentWillUnmount()
  {
    this.userUnsubscribe && this.userUnsubscribe();
    this.authUnsubscribe && this.authUnsubscribe();
  }
  
  renderInfoItem(key:string)
  {
    return (
      <div className='profile-info-item' key={key}>
        <div className='profile-info-item-name'>
          { key.replace(/([A-Z])/g, (v) => " " + v) }
        </div>
        <div className='profile-info-item-value'>
          { this.state.user[key] }
        </div>
      </div>
    );
  }
  
  render()
  {
    if(this.state.loading)
    {
      return <InfoArea large='Loading...' />
    }
    
    if(!this.state.user)
    {
      return <InfoArea large='No such user found.' />
    }
    
    return (
      <div className='profile'>
        <div
          className='profile-pic'
        >
          <img
            className='profile-pic-image'
            src={this.state.user.imgSrc}
            ref='profilePicImg'
          />
        </div>
        <div className='profile-name'>
          { this.state.user.name() }
        </div>
        <div className='profile-edit-row'>
          <Link to='/account/profile/edit' className='button'>
            Edit
          </Link>
        </div>
        <div className='profile-info'>
          { 
            this.infoKeys.map(this.renderInfoItem)
          }
        </div>
      </div>
    );
  }
}

export default Profile;