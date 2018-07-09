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

// Copyright 2018 Terrain Data, Inc.
// tslint:disable:no-var-requires

import * as React from 'react';

import Util from 'util/Util';

import EndpointForm from 'etl/common/components/EndpointForm';
import { WalkthroughActions } from 'etl/walkthrough/ETLWalkthroughRedux';
import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { ETLStepComponent, StepProps, TransitionParams } from './ETLStepComponent';
import './ETLStepComponent.less';

interface Props extends StepProps
{
  isSource: boolean;
}

class PickEndpointStep extends ETLStepComponent<Props>
{
  public static onRevert(isSource: boolean, params: TransitionParams)
  {
    if (isSource)
    {
      params.act({
        actionType: 'setState',
        state: {
          source: _SourceConfig(),
        },
      });
    }
    else
    {
      params.act({
        actionType: 'setState',
        state: {
          sink: _SinkConfig(),
        },
      });
    }
  }

  public static onArrive(isSource: boolean, params: TransitionParams)
  {
    if (isSource)
    {
      params.act({
        actionType: 'setState',
        state: {
          source: _SourceConfig(),
        },
      });
    }
    else
    {
      params.act({
        actionType: 'setState',
        state: {
          sink: _SinkConfig(),
        },
      });
    }
  }

  public render()
  {
    const { walkthrough, isSource } = this.props;
    const endpoint = isSource ? walkthrough.source : walkthrough.sink;
    const endpointChosen = endpoint.type !== null;

    return (
      <div className='etl-transition-column'>
        <EndpointForm
          isSource={isSource}
          endpoint={endpoint}
          onChange={this.handleChange}
        />
        <div className='etl-step-next-button-spacer'>
          {this._renderNextButton(endpointChosen)}
        </div>
      </div>
    );
  }

  public handleChange(endpoint: SourceConfig | SinkConfig)
  {
    const { walkthrough, act, isSource } = this.props;
    const key = isSource ? 'source' : 'sink';

    if (isSource)
    {
      act({
        actionType: 'setState',
        state: {
          source: endpoint as SourceConfig,
        },
      });
    }
    else
    {
      act({
        actionType: 'setState',
        state: {
          sink: endpoint as SinkConfig,
        },
      });
    }

  }

}

const transitionRowHeight = '28px';
export default Util.createTypedContainer(
  PickEndpointStep,
  ['walkthrough'],
  { act: WalkthroughActions },
);
