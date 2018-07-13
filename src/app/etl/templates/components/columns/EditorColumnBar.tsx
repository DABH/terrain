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
// tslint:disable:no-var-requires import-spacing
import TerrainComponent from 'common/components/TerrainComponent';
import * as Radium from 'radium';
import * as React from 'react';

import Menu from 'common/components/Menu';
import { Colors, fontColor } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { columnOptions, TemplateEditorState } from 'etl/templates/TemplateEditorTypes';

const DropdownIcon = require('images/icon_carrot.svg');

import './EditorColumnBar.less';

export interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class EditorColumnBar extends TerrainComponent<Props>
{
  public menu: any = null;

  public menuOptions = this.computeMenuOptions();

  public computeMenuOptions()
  {
    return columnOptions.map((option, i) =>
    {

      const onClick = () =>
      {
        this.props.act({
          actionType: 'setDisplayState',
          state: {
            columnState: option,
          },
        });
      };

      return {
        text: option,
        onClick,
      };
    }).toList();
  }

  public render()
  {
    const { uiState } = this.props.templateEditor;
    return (
      <div
        className='editor-column-title-section'
        onClick={this.handleDropdownClicked}
        style={fontColor(Colors().text2)}
      >
        <div
          className='editor-column-header-text'
        >
          {uiState.columnState}
        </div>
        <div
          className='editor-column-header-dropdown'
        >
          <Menu
            registerButton={(button) => this.menu = button}
            options={this.menuOptions}
            overrideMultiplier={7}
          />
          <DropdownIcon />
        </div>
      </div>
    );
  }

  public handleDropdownChange(columnIndex: number)
  {
    const { act, templateEditor } = this.props;
    act({
      actionType: 'setDisplayState',
      state: {
        columnState: columnOptions.get(columnIndex),
      },
    });
  }

  public handleDropdownClicked()
  {
    if (this.menu !== null)
    {
      this.menu.click();
    }
  }
}

export default Util.createContainer(
  EditorColumnBar,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
