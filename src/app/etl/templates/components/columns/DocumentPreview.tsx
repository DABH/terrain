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
import * as Immutable from 'immutable';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import RootFieldNode from 'etl/templates/components/field/RootFieldNode';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';

import './DocumentsPreviewColumn.less';
const { List } = Immutable;
const Color = require('color');
const ShowIcon = require('images/icon_search.svg');

export interface Props
{
  index: number;
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class DocumentPreview extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);
    this.getVeilStyle = memoizeOne(this.getVeilStyle);
    this.getFaderStyle = memoizeOne(this.getFaderStyle);
    this.transformDocument = memoizeOne(this.transformDocument);
  }

  // gets memoizedOne'd
  public transformDocument(previewDocument, engine, engineVersion)
  {
    if (previewDocument == null || engine == null)
    {
      return {};
    }
    try
    {
      return engine.transform(previewDocument);
    }
    catch (e)
    {
      return {};
    }
  }

  public getDocument()
  {
    const { index, templateEditor } = this.props;
    const { previewIndex, engineVersion } = templateEditor.uiState;
    const documents = templateEditor.getPreviewDocuments();

    const previewDocument = index < documents.size && documents.size > 0 ? documents.get(index) : null;
    return this.transformDocument(previewDocument, templateEditor.getCurrentEngine(), engineVersion);
  }

  public render()
  {
    const { uiState } = this.props.templateEditor;
    const transformedPreviewDocument = this.getDocument();

    const isCurrentPreview = this.props.index === uiState.previewIndex;
    const border = isCurrentPreview ?
      borderColor(Colors().inactiveHover, Colors().inactiveHover) :
      borderColor('rgba(0,0,0,0)', Colors().activeHover);
    const bgColor = Colors().bg3;
    const documentStyle = [
      backgroundColor(bgColor),
      getStyle('boxShadow', `1px 1px 5px ${Colors().boxShadow}`),
      border,
    ];
    return (
      <div
        className='preview-document'
        style={documentStyle}
        onClick={this.handleDocumentClicked}
      >
        <div className='preview-document-spacer'>
          <RootFieldNode
            preview={transformedPreviewDocument}
            noInteract={true}
          />
        </div>
        <div
          key='fader'
          className='preview-document-fader'
          style={this.getFaderStyle(bgColor)}
        />
        <div
          key='veil'
          className='preview-document-veil'
          style={this.getVeilStyle(bgColor, isCurrentPreview)}
        >
          <ShowIcon className='preview-document-icon' width='64px' />
        </div>
      </div>
    );
  }

  public handleDocumentClicked()
  {
    this.props.act({
      actionType: 'closeSettings',
    });
    this.props.act({
      actionType: 'setDisplayState',
      state: {
        previewIndex: this.props.index,
      },
    });
  }

  public getVeilStyle(bg: string, active: boolean)
  {
    const hoverCol = scaleAlpha(bg, 0.5);
    const defaultCol = scaleAlpha(bg, 0.0);
    if (active)
    {
      const activeCol = scaleAlpha(Colors().active, 0.7);
      return [
        backgroundColor(hoverCol, hoverCol),
        fontColor(activeCol, activeCol),
      ];
    }
    else
    {
      const activeCol = scaleAlpha(Colors().inactiveHover, 0.5);
      return [
        backgroundColor(defaultCol, hoverCol),
        fontColor('rgba(0,0,0,0)', activeCol),
      ];
    }
  }

  public getFaderStyle(bg: string)
  {
    const colObj = Color(bg);
    const minFade = colObj.alpha(colObj.alpha());
    const maxFade = colObj.alpha(0);
    return getStyle('background', `linear-gradient(${maxFade.toString()}, ${minFade.toString()})`);
  }
}

const emptyList = List([]);

function scaleAlpha(color, factor)
{
  const colObj = Color(color);
  return colObj.alpha(colObj.alpha() * factor).toString();
}

export default Util.createContainer(
  DocumentPreview,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
