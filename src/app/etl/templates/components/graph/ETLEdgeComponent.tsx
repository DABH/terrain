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
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors } from 'src/app/colors/Colors';
import Util from 'util/Util';

const Color = require('color');
import Menu from 'common/components/Menu';
import { MenuOption } from 'common/components/Menu';

import GraphHelpers from 'etl/helpers/GraphHelpers';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { ETLEdge, ETLNode } from 'shared/etl/immutable/ETLProcessRecords';
import { NodeTypes } from 'shared/etl/types/ETLTypes';

import './EdgeSection.less';

const { List, Map } = Immutable;

export interface Props
{
  edgeId: number;
  edge: ETLEdge;
  // below from container
  templateEditor: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class ETLEdgeComponent extends TerrainComponent<Props>
{
  public computeMenuOptions(): List<MenuOption>
  {
    const { edge } = this.props;
    const template = this.props.templateEditor.template;

    let options = List([
      {
        text: 'Edit This Step',
        onClick: this.makeThisActive,
      },
    ]);
    if (edge.to !== -1)
    {
      options = options.push({
        text: 'Merge Into This Step',
        onClick: this.openMergeUI,
      });
    }
    const fromNode = template.findNodes((n) => n.id === edge.from).first();
    if (fromNode !== undefined && template.getNode(fromNode).type === NodeTypes.Source)
    {
      options = options.push({
        text: 'Reset this Edge',
        onClick: this.recomputeEdge,
      });
    }

    return options;
  }

  public renderNode(node: ETLNode, id: number)
  {
    if (node == null)
    {
      return (
        <div className='edge-component-spacing'>
          N/A
        </div>
      );
    }

    const { template } = this.props.templateEditor;
    let name = '';
    if (node.type === NodeTypes.Source)
    {
      name = template.getSourceName(node.endpoint);
    }
    else if (node.type === NodeTypes.Sink)
    {
      name = template.getSinkName(node.endpoint);
    }
    else
    {
      name = template.getNodeName(id);
    }

    return (
      <div className='edge-component-spacing'>
        {name}
      </div>
    );
  }

  public renderBetween()
  {
    return (
      <div className='edge-component-spacing-small'>
        to
      </div>
    );
  }

  public render()
  {
    const { edgeId, edge, templateEditor } = this.props;
    const { from, to } = edge;
    const fromNode = templateEditor.template.getNode(from);
    const toNode = templateEditor.template.getNode(to);

    const isActive = templateEditor.getCurrentEdgeId() === edgeId;
    const style = isActive ? edgeComponentStyleActive : edgeComponentStyle;
    return (
      <div
        className='edge-component-item'
        style={style}
        key={`${isActive}`}
      >
        {this.renderNode(fromNode, from)}
        {this.renderBetween()}
        {this.renderNode(toNode, to)}
        <div className='edge-item-menu-wrapper'>
          <Menu options={this.computeMenuOptions()} />
        </div>
      </div>
    );
  }

  public makeThisActive()
  {
    const { act, edgeId, templateEditor } = this.props;
    GraphHelpers.switchEdge(edgeId);
  }

  public recomputeEdge()
  {
    const onConfirm = () =>
    {
      this.props.act({
        actionType: 'setFieldMap',
        fieldMap: Map(),
      });
      GraphHelpers.createEngineForSourceEdge(this.props.edgeId);
    };
    this.props.act({
      actionType: 'addModal',
      props: {
        title: 'Confirm Action',
        message: 'Are you sure you want to reset this edge? You will lose all settings associated with this edge',
        confirm: true,
        closeOnConfirm: true,
        onConfirm,
      },
    });
  }

  public openMergeUI()
  {
    const { act, edgeId } = this.props;
    act({
      actionType: 'setDisplayState',
      state: {
        mergeIntoEdgeId: edgeId,
      },
    });
  }
}

const edgeComponentStyle = [
  backgroundColor(Colors().bg3),
  borderColor(Colors().border2, Colors().active),
];

const edgeComponentStyleActive = [
  backgroundColor(Colors().bg3),
  borderColor(Colors().active, Colors().active),
];

export default Util.createContainer(
  ETLEdgeComponent,
  [
    ['templateEditor'],
  ],
  { act: TemplateEditorActions },
);
