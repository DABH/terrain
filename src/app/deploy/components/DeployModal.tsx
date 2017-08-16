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

// tslint:disable:no-empty-interface strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TerrainComponent from './../../common/components/TerrainComponent';
import './DeployModal.less';

import BackendInstance from '../../../database/types/BackendInstance';
import { ItemStatus } from '../../../items/types/Item';
import Modal from '../../common/components/Modal';
import LibraryActions from '../../library/data/LibraryActions';
import LibraryStore from '../../library/data/LibraryStore';
import * as LibraryTypes from '../../library/LibraryTypes';
import TQLEditor from '../../tql/components/TQLEditor';
import DeployModalColumn from './DeployModalColumn';

import EQLTemplateGenerator from '../../../../shared/database/elastic/parser/EQLTemplateGenerator';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';

export interface Props
{
}

class DeployModal extends TerrainComponent<Props>
{
  public state: {
    changingStatus: boolean;
    changingStatusOf: LibraryTypes.Variant;
    changingStatusTo: ItemStatus;
    defaultChecked: boolean;
    errorModalMessage: string;
    showErrorModal: boolean;
  } = {
    changingStatus: false,
    changingStatusOf: null,
    changingStatusTo: null,
    defaultChecked: false,
    errorModalMessage: '',
    showErrorModal: false,
  };

  public componentDidMount()
  {
    this._subscribe(LibraryStore, {
      updater: (state) =>
      {
        const { changingStatus, changingStatusOf, changingStatusTo } = state;
        if (
          changingStatus !== this.state.changingStatus ||
          changingStatusOf !== this.state.changingStatusOf ||
          changingStatusTo !== this.state.changingStatusTo
        )
        {
          this.setState({
            changingStatus,
            changingStatusOf,
            changingStatusTo,
            defaultChecked: changingStatusTo === 'DEFAULT',
          });
        }
      },
      isMounted: true,
    });
  }

  public handleClose()
  {
    LibraryActions.variants.status(null, null);
  }

  public handleDeploy()
  {
    const variant = this.state.changingStatusOf;

    const state = LibraryStore.getState();
    const group = state.getIn(['groups', variant.groupId]) as LibraryTypes.Group;
    const algorithm = state.getIn(['algorithms', variant.algorithmId]) as LibraryTypes.Algorithm;
    const id: string = group.name + '.' + algorithm.name + '.' + variant.name;

    if (this.state.changingStatusTo === ItemStatus.Live && variant.status !== 'LIVE')
    {
      const tql = variant ? variant.query.tql : '';
      const parser: ESJSONParser = new ESJSONParser(tql);
      const valueInfo: ESValueInfo = parser.getValueInfo();
      if (parser.getErrors().length > 0)
      {
        this.setState({
          errorModalMessage: 'Error changing status of ' + this.state.changingStatusOf.name + ' to ' + this.state.changingStatusTo,
        });
        this.toggleErrorModal();
        return;
      }
      const template = EQLTemplateGenerator.generate(valueInfo);
      const body: object = {
        id,
        body: {
          template,
        },
      };
      LibraryActions.variants.deploy(variant, 'putTemplate', body, this.state.changingStatusTo);
    }
    else if (this.state.changingStatusTo !== ItemStatus.Live && variant.status === 'LIVE')
    {
      // undeploy this variant
      const body: object = {
        id,
      };
      LibraryActions.variants.deploy(variant, 'deleteTemplate', body, this.state.changingStatusTo);
    }
  }

  public renderTQLColumn(defaultVariant: LibraryTypes.Variant)
  {
    const variant = this.state.changingStatusOf;
    const defaultTql =
      (this.state.defaultChecked && defaultVariant) ? defaultVariant.query.tql : null;
    const tql = variant ? variant.query.tql : '';

    return (
      <div className='deploy-modal-tql'>
        <div className='deploy-modal-tql-wrapper'>
          <TQLEditor
            canEdit={false}
            tql={tql}
            isDiff={this.state.defaultChecked && defaultTql !== null}
            diffTql={defaultTql}
          />
        </div>
      </div>
    );
  }

  public toggleErrorModal()
  {
    this.setState({
      showErrorModal: !this.state.showErrorModal,
    });
  }

  public handleDefaultCheckedChange(defaultChecked: boolean)
  {
    this.setState({
      defaultChecked,
    });
  }

  public render()
  {
    if (!this.state.changingStatus)
    {
      return null;
    }

    const { changingStatus, changingStatusOf, changingStatusTo } = this.state;
    const name = (changingStatusOf && changingStatusOf.name);

    let title = 'Deploy "' + name + '" to Live';
    if (changingStatusTo !== ItemStatus.Live)
    {
      title = 'Remove "' + name + '" from Live';
    }

    let defaultVariant: LibraryTypes.Variant;
    if (this.state.defaultChecked)
    {
      const libraryState = LibraryStore.getState();
      defaultVariant = libraryState.variants.find(
        (v) => v.algorithmId === changingStatusOf.algorithmId && v.status === 'DEFAULT',
      );
    }

    return (
      <div>
      <Modal
        open={this.state.changingStatus}
        message={null}
        onClose={this.handleClose}
        title={title}
        confirm={false}
        fill={true}
      >
        {
          changingStatusOf &&
          <div
            className={classNames({
              'deploy-modal': true,
            })}
          >
            {
              this.renderTQLColumn(defaultVariant)
            }
            <DeployModalColumn
              variant={changingStatusOf}
              status={changingStatusTo}
              onDeploy={this.handleDeploy}
              defaultChecked={this.state.defaultChecked}
              defaultVariant={defaultVariant}
              onDefaultCheckedChange={this.handleDefaultCheckedChange}
            />
          </div>
        }
        <Modal
          message={this.state.errorModalMessage}
          onClose={this.toggleErrorModal}
          open={this.state.showErrorModal}
          error={true}
        />
      </Modal>
      </div>
    );
  }
}

export default DeployModal;
