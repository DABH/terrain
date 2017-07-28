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

// tslint:disable:no-var-requires strict-boolean-expressions no-unused-expression

import * as classNames from 'classnames';
import { List, Map } from 'immutable';
import * as React from 'react';
import { Link } from 'react-router';

import BackendInstance from '../../../database/types/BackendInstance';
import AuthStore from '../../auth/data/AuthStore';
import CreateItem from '../../common/components/CreateItem';
import Dropdown from '../../common/components/Dropdown';
import InfoArea from '../../common/components/InfoArea';
import Modal from '../../common/components/Modal';
import TerrainComponent from '../../common/components/TerrainComponent';
import SchemaActionTypes from '../../schema/data/SchemaActionTypes';
import { SchemaActions, SchemaStore } from '../../schema/data/SchemaStore';
import * as SchemaTypes from '../../schema/SchemaTypes';
import Ajax from '../../util/Ajax';
import UserActions from '../data/UserActions';
import UserStore from '../data/UserStore';
import * as UserTypes from '../UserTypes';

const CloseIcon = require('../../../images/icon_close_8x8_gray.svg');

import './Connections.less';

interface Server extends BackendInstance
{
  host: string;
  status: string;
}

export interface Props
{
  params?: any;
  history?: any;
  children?: any;
}

class Connections extends TerrainComponent<Props>
{
  public state: {
    typeIndex: number,
    loading: boolean,
    servers: Server[],
    expanded: Map<number, boolean>,
    addingConnection: boolean,
    errorModalOpen: boolean,
    errorModalMessage: string,
  } = {
    typeIndex: 0,
    loading: true,
    servers: null,
    expanded: Map(),
    addingConnection: false,
    errorModalOpen: false,
    errorModalMessage: '',
  };

  public xhr: XMLHttpRequest = null;

  public ConnectionTypes = List(
    [
      'elastic',
      'mysql',
    ],
  );

  constructor(props)
  {
    super(props);
  }

  public fetchConnections(props)
  {
    this.xhr = Ajax.req(
      'get',
      'database',
      {},
      (servers: Server[]) =>
      {
        if (servers)
        {
          this.setState({
            servers,
          });
        }
      });
  }

  public componentWillMount()
  {
    this.fetchConnections(this.props);
  }

  public componentWillUnmount()
  {
    this.xhr && this.xhr.abort();
    this.xhr = null;
  }

  public componentWillReceiveProps(nextProps)
  {
    this.fetchConnections(nextProps);
  }

  public updateState()
  {
    this.setState({
      servers: SchemaStore.getState().get('servers'),
      loading: SchemaStore.getState().get('loading'),
    });
  }

  public expandConnection(e, id: number)
  {
    const newExpanded: Map<number, boolean> = this.state.expanded;
    this.setState({
      expanded: newExpanded.set(id, !!!newExpanded.get(id)),
    });
  }

  public removeConnection(e, id: number)
  {
    Ajax.deleteDb(id, () =>
    {
      this.fetchConnections(this.props);
    }, (error) =>
      {
        this.setState({
          errorModalMessage: 'Error deleting connection: ' + JSON.stringify(error),
        });
        this.toggleErrorModal();
      });
  }

  public renderConnectionInfo(server: Server)
  {
    if (this.state.expanded.get(server.id as number))
    {
      return (
        <div className='connections-item-info'>
          <div className='connections-item-info-row'>
            Type:
            <div className='connections-item-info-value'>
              {
                server.type
              }
            </div>
          </div>
          <div className='connections-item-info-row'>
            Address:
            <div className='connections-item-info-value'>
              {
                server.host
              }
            </div>
          </div>
        </div>
      );
    }
  }

  public renderServer(server: Server)
  {
    const connInfo = this.renderConnectionInfo(server);
    const id: number = server.id as number;
    const connected: boolean = server.status === 'CONNECTED';
    return (
      <div key={server.id}>
        <div className='connections-row'>
          <div className='connections-items' onClick={(e) => this.expandConnection(e, id)}>
            <div className='connections-id'>
              {
                server.id
              }
            </div>
            <div className='connections-name'>
              {
                server.name
              }
            </div>
            <div className='connections-status'>
              <div className={classNames({
                connected,
                disconnected: !connected,
              })}>
                {
                  connected ? 'CONNECTED' : 'DISCONNECTED'
                }
              </div>
            </div>
          </div>
          <div className='connections-remove' onClick={(e) => this.removeConnection(e, id)} data-tip='Remove'>
            <CloseIcon />
          </div>
        </div>
        {connInfo}
      </div>
    );
  }

  public toggleAddingConnection()
  {
    this.setState({
      addingConnection: !this.state.addingConnection,
    });
  }

  public createConnection()
  {
    const name: string = this.refs['name']['value'];
    const address: string = this.refs['address']['value'];
    const type = this.ConnectionTypes.get(this.state.typeIndex);

    if (!name.length)
    {
      this.setState({
        errorModalMessage: 'Connection name is required.',
      });
      this.toggleErrorModal();
      return;
    }

    if (!address.length)
    {
      this.setState({
        errorModalMessage: 'Server address is required.',
      });
      this.toggleErrorModal();
      return;
    }

    this.refs['name']['value'] = '';
    this.refs['address']['value'] = '';
    this.setState({
      addingConnection: false,
    });

    Ajax.createDb(name, address, type, () =>
    {
      this.fetchConnections(this.props);
    }, (error) =>
      {
        this.setState({
          errorModalMessage: 'Error creating connection: ' + JSON.stringify(error),
        });
        this.toggleErrorModal();
      });
  }

  public handleTypeChange(index: number)
  {
    this.setState({
      typeIndex: index,
    });

    const type = this.ConnectionTypes.get(index);
    UserActions.changeType(type);
  }

  public renderAddConnection()
  {
    const userId = AuthStore.getState().id;
    const user = UserStore.getState().getIn(['users', userId]) as UserTypes.User;

    if (user && user.isSuperUser)
    {
      if (this.state.addingConnection)
      {
        return (
          <div className='create-server'>
            <h3>Add a new connection</h3>
            <div className='flex-container'>
              <div className='flex-grow'>
                <b>Connection Type</b>
                <div>
                  <Dropdown
                    selectedIndex={this.state.typeIndex}
                    options={this.ConnectionTypes}
                    onChange={this.handleTypeChange}
                    canEdit={true}
                    className='create-server-dropdown'
                  />
                </div>
              </div>
              <div className='flex-grow'>
                <b>Connection Name</b>
                <div>
                  <input ref='name' placeholder='Name' />
                </div>
              </div>
              <div className='flex-grow'>
                <b>Server Address</b>
                <div>
                  <input ref='address' placeholder='Address' />
                </div>
              </div>
            </div>
            <div className='button' onClick={this.createConnection}>
              Create
            </div>
            <div className='button' onClick={this.toggleAddingConnection}>
              Cancel
            </div>
          </div>
        );
      }

      return (
        <CreateItem
          name='New Connection'
          onCreate={this.toggleAddingConnection}
        />
      );
    }
    return null;
  }

  public toggleErrorModal()
  {
    this.setState({
      errorModalOpen: !this.state.errorModalOpen,
    });
  }

  public render()
  {
    const { servers, loading } = this.state;
    return (
      <div>
        <div className='connections'>
          <div className='connections-page-title'>
            Database Connections
        </div>
          {
            loading &&
            <InfoArea large='Loading...' />
          }
          {servers && servers.map(this.renderServer)}
          {this.renderAddConnection()}
        </div>
        <Modal
          message={this.state.errorModalMessage}
          onClose={this.toggleErrorModal}
          open={this.state.errorModalOpen}
          error={true}
        />
      </div>
    );
  }
}

export default Connections;
