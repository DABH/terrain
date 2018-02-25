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

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';

import FadeInOut from 'common/components/FadeInOut';
import { ComponentProps } from 'common/components/walkthrough/WalkthroughTypes';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Quarantine from 'util/RadiumQuarantine';

import { ETLActions } from 'etl/ETLRedux';
import { ETLState, ViewState, WalkthroughState } from 'etl/ETLTypes';
import './ETLStepComponent.less';

export interface StepProps extends ComponentProps
{
  onDone: () => void;
  etl?: ETLState;
  act?: typeof ETLActions;
}

export interface RevertParams
{
  act: typeof ETLActions,
  etl: ETLState,
}

export abstract class ETLStepComponent<Props extends StepProps = StepProps> extends TerrainComponent<Props>
{
  public static onRevert(params: RevertParams)
  {
    // do nothing by default
  }

  public _getButtonStyle(enabled)
  {
    return enabled ? activeStyle : disabledStyle;
  }

  public _getButtonClass(enabled)
  {
    return classNames({
      'etl-step-big-button': true,
      'button-disabled': !enabled,
    });
  }

  public _renderNextButton(shown = true, enabled = true)
  {
    return (
      <FadeInOut open={shown}>
        <Quarantine>
          <div
            className={this._getButtonClass(enabled)}
            onClick={enabled ? this.props.onDone : () => null}
            style={this._getButtonStyle(enabled)}
          >
            Next
          </div>
        </Quarantine>
      </FadeInOut>
    );
  }
}

const activeStyle = [
  backgroundColor(Colors().active, Colors().activeHover),
  fontColor(Colors().activeText),
];
const disabledStyle = [
  backgroundColor(Colors().activeHover, Colors().activeHover),
  fontColor(Colors().activeText),
];
