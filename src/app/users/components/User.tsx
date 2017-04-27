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
import { Link } from 'react-router';
import Classs from './../../common/components/Classs';
import InfoArea from './../../common/components/InfoArea';
import Actions from './../data/UserActions';
import Store from './../data/UserStore';
import LibraryTypes from './../UserTypes';
const HomeIcon = require('./../../../images/icon_profile_16x16.svg?name=HomeIcon');

export interface Props
{
  params?: any;
  history?: any;
}

class User extends Classs<Props>
{
  cancelSubscription = null;

  constructor(props)
  {
    super(props);

    this.state = {
      istate: Store.getState(),
    };

    this.cancelSubscription =
      Store.subscribe(() => this.setState({
        istate: Store.getState(),
      }));
  }

  componentWillMount()
  {
    // Actions.fetch();
  }

  componentWillUnmount()
  {
    this.cancelSubscription && this.cancelSubscription();
  }

  render()
  {
    const state = this.state.istate;

    return (
      <div className="account">
        <div className="account-wrapper">
          <div className="account-title">
            <HomeIcon />
            User!
          </div>
        </div>
      </div>
    );
  }
}

export default User;
