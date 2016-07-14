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

require('./Account.less');
import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import Store from './../data/UserStore.tsx';
import Actions from './../data/UserActions.tsx';
import BrowserTypes from './../UserTypes.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import { Link } from 'react-router';
var HomeIcon = require("./../../../images/icon_profile_16x16.svg?name=HomeIcon");

interface Props
{
  location?: any;
  children?: any;
}

class Account extends Classs<Props>
{
  render()
  {
    var title = "Account";
    var classNames = {
      profile: "account-link",
      notifications: "account-link",
      team: "account-link",
      settings: "account-link"
    }
    switch(this.props.location.pathname)
    {
      case "/account/profile":
        title = "Profile";
        classNames.profile = "account-link-current";
        break;
      case "/account/notifications":
        title = "Notifications";
        classNames.notifications = "account-link-current";
        break;
      case "/account/team":
        title = "Team";
        classNames.team = "account-link-current";
        break;
      case "/account/settings":
        title = "Settings";
        classNames.settings = "account-link-current";
        break;
      default:
        classNames.profile = "account-link-current";
        break;      
    }
    
    return (
      <div className='account'>
        <div className='account-wrapper'>
          <div className='account-title'>
            <HomeIcon />
            { title }
          </div>
          <div className='account-links'>
            <Link to={'/account/settings'} className={classNames.settings}>
              Settings
            </Link>
            <Link to={'/account/notifications'} className={classNames.notifications}>
              Notifications
            </Link>
            <Link to={'/account/profile'} className={classNames.profile}>
              Profile
            </Link>
            <Link to={'/account/team'} className={classNames.team}>
              Team
            </Link>
          </div>
          <div className='account-inner'>
            { this.props.children }
          </div>
        </div>
      </div>
    );
  }
}

export default Account;