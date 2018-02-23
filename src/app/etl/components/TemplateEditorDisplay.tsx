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
// tslint:disable:no-var-requires

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';

import { Algorithm, LibraryState } from 'library/LibraryTypes';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import TemplateEditor from 'etl/templates/components/TemplateEditor';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { _ETLTemplate, ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';
import { NoArrayDocuments, testSerialization } from 'etl/templates/TemplateUtil';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

import { createTreeFromEngine } from 'etl/templates/SyncUtil';

const { List } = Immutable;
import './TemplateEditorDisplay.less';

export interface Props
{
  params?: {
    algorithmId?: number,
  };
  algorithms: IMMap<ID, Algorithm>;

  act?: typeof TemplateEditorActions;
}

function getAlgorithmId(params): number
{
  const asNumber = (params != null && params.algorithmId != null) ? Number(params.algorithmId) : NaN;
  return Number.isNaN(asNumber) ? -1 : asNumber;
}

function initialTemplateFromDocs(documents: List<object>): { template: ETLTemplate, rootField: TemplateField }
{
  if (documents.size === 0)
  {
    return {
      template: _ETLTemplate(),
      rootField: _TemplateField(),
    };
  }

  const firstDoc = documents.get(0);
  const engine = new TransformationEngine(firstDoc);
  const rootField = createTreeFromEngine(engine);

  const template = _ETLTemplate({
    templateId: -1,
    templateName: name,
    transformationEngine: engine,
  });
  return {
    template,
    rootField,
  };
}

@Radium
class TemplateEditorDisplay extends TerrainComponent<Props>
{
  public initFromAlgorithm()
  {
    const { algorithms, params, act } = this.props;
    const algorithmId = getAlgorithmId(params);
    const algorithm = (algorithms != null && algorithms.has(algorithmId)) ? algorithms.get(algorithmId) : null;

    const onFetched = (hits: List<object>) =>
    {
      const { template, rootField } = initialTemplateFromDocs(hits);
      act({
        actionType: 'setTemplate',
        template,
      });
      act({
        actionType: 'setRoot',
        rootField,
      });
    };
    act({
      actionType: 'fetchDocuments',
      source: {
        type: 'algorithm',
        algorithm,
      },
      onFetched,
    });
  }

  public componentWillMount()
  {
    this.props.act({
      actionType: 'resetState',
    });
    if (this.props.params.algorithmId !== undefined)
    {
      this.initFromAlgorithm();
    }
  }

  public render()
  {
    return (
      <div
        className='template-display-wrapper'
        style={[fontColor(Colors().text1)]}
      >
        <div className='export-display-logo-bg' />
        <TemplateEditor />
      </div>
    );
  }
}

export default Util.createContainer(
  TemplateEditorDisplay,
  [['library', 'algorithms']],
  { act: TemplateEditorActions },
);
