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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, getStyle } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List } = Immutable;
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import FadeInOut from 'app/common/components/FadeInOut';
import FloatingInput from 'app/common/components/FloatingInput';
import { tooltip } from 'app/common/components/tooltip/Tooltips';
import TQLEditor from 'app/tql/components/TQLEditor';
import Util from 'app/util/Util';
import ExpandIcon from 'common/components/ExpandIcon';
import RouteSelector from 'common/components/RouteSelector';
import { FieldType } from '../../../../../../shared/builder/FieldTypes';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderArea from '../PathfinderArea';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import PathfinderText from '../PathfinderText';
import
{
  _ChoiceOption, _Path,
  More, Path, PathfinderContext, Source,
} from '../PathfinderTypes';
import DragAndDrop, { DraggableItem } from './../../../../common/components/DragAndDrop';
import DragHandle from './../../../../common/components/DragHandle';
import PathfinderAggregationLine from './PathfinderAggregationLine';
import './PathfinderMoreStyle.less';

const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  pathfinderContext: PathfinderContext;
  keyPath: KeyPath;
  nested: List<Path>;
  reference: string;
  toSkip?: number;
  builderActions?: typeof BuilderActions;
}

export interface State
{
  childNames: { string: number } | {};
}

class PathfinderNestedSection extends TerrainComponent<Props>
{
  public state: State;

  public constructor(props)
  {
    super(props);

    this.state = {
      childNames: this.getChildNames(props),
    };
  }

  public componentWillReceiveProps(nextProps)
  {
    this.state = {
      childNames: this.getChildNames(nextProps),
    };
  }

  public handleReferenceChange(value)
  {
    const { keyPath } = this.props;
    this.props.builderActions.changePath(this._ikeyPath(keyPath.butLast().toList(), 'reference'), value);
  }

  public handleAddNested()
  {
    if (this.props.reference === undefined)
    {
      const currIndex = (this.props.pathfinderContext.source.dataSource as any).index;
      this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath.butLast().toList(), 'reference'),
        currIndex);
    }
    const nestedKeyPath = this._ikeyPath(this.props.keyPath.butLast().toList(), 'nested');
    this.props.builderActions.changePath(nestedKeyPath,
      this.props.nested.push(_Path({ name: undefined, step: 0, source: { count: 3 } })), true);
  }

  public handleDeleteNested(i)
  {
    if (this.props.pathfinderContext.canEdit)
    {
      this.props.builderActions.changePath(
        this.props.keyPath,
        this.props.nested.splice(i, 1));
    }
  }

  public handleSourceChange(i, value)
  {
    if (this.props.pathfinderContext.canEdit)
    {
      const nestedKeyPath = this._ikeyPath(this.props.keyPath, i, 'name');
      this.props.builderActions.changePath(
        nestedKeyPath,
        value);
    }
  }

  public renderPath(path: Path, i: number)
  {
    return (
      <PathfinderArea
        path={path}
        canEdit={this.props.pathfinderContext.canEdit}
        schema={this.props.pathfinderContext.schemaState}
        keyPath={this.props.keyPath.push(i)}
        toSkip={this.props.toSkip + 2} // Every time you nest, the filter section needs to know how nested it is
        parentSource={this.props.pathfinderContext.source}
        parentName={this.props.reference}
        onSourceChange={this._fn(this.handleSourceChange, i)}
      />
    );
  }

  public handleAlgorithmNameChange(i: number, value: any)
  {
    const nestedKeyPath = this._ikeyPath(this.props.keyPath, i, 'name');
    this.props.builderActions.changePath(nestedKeyPath, value);
  }

  public handleExpandNested(keyPath, expanded)
  {
    this.props.builderActions.changePath(keyPath, expanded);
  }

  // Nested fields cannot have the same Child name
  public isValidChildName(childName)
  {
    return childName === undefined ||
      childName === '' ||
      this.state.childNames[childName] < 2;
  }

  public getChildNames(props)
  {
    const childNames = {};

    props.nested.map((n) =>
    {
      if (childNames[n.name] === undefined)
      {
        childNames[n.name] = 1;
      } else
      {
        childNames[n.name] += 1;
      }
    });

    return childNames;
  }

  public renderNestedPaths()
  {
    const { nested, reference, keyPath, pathfinderContext } = this.props;
    const { canEdit, source } = pathfinderContext;
    return (
      <div>
        {
          nested.map((nestedPath, i) =>
          {
            const expanded = nested.get(i) !== undefined ? nested.get(i).expanded : false;
            return (
              <div
                className='pf-more-nested'
                key={i}
                style={
                  _.extend({},
                    backgroundColor(Colors().blockBg),
                    borderColor(Colors().blockOutline),
                    { paddingBottom: expanded ? 6 : 0 },
                  )}
              >
                <div className='pf-more-nested-reference'>
                  <ExpandIcon
                    onClick={this._fn(
                      this.handleExpandNested,
                      this._ikeyPath(keyPath, i, 'expanded'),
                      !expanded)}
                    open={expanded}
                  />
                  <span className='nested-reference-header'>@</span>
                  {
                    tooltip(
                      <FloatingInput
                        label={PathfinderText.referenceName}
                        isTextInput={true}
                        value={reference}
                        onChange={this.handleReferenceChange}
                        canEdit={canEdit}
                        className='pf-more-nested-reference-input'
                        noBg={true}
                        debounce={true}
                        forceFloat={true}
                        noBorder={false}
                        showEllipsis={true}
                      />,
                      PathfinderText.referenceExplanation,
                    )
                  }
                  <FadeInOut
                    open={nested.get(i) !== undefined}
                  >
                    <FloatingInput
                      value={nestedPath.name}
                      onChange={this._fn(this.handleAlgorithmNameChange, i)}
                      label={PathfinderText.innerQueryName}
                      isTextInput={true}
                      canEdit={canEdit}
                      className='pf-more-nested-name-input'
                      noBg={true}
                      forceFloat={true}
                      noBorder={false}
                      debounce={true}
                      showEllipsis={true}
                      showWarning={!this.isValidChildName(nestedPath.name)}
                      warningText={'Cannot have two nested queries with the same name'}
                    />
                  </FadeInOut>
                  {
                    canEdit &&
                    <RemoveIcon
                      onClick={this._fn(this.handleDeleteNested, i)}
                      className='pf-more-nested-remove close'
                    />
                  }
                </div>
                <FadeInOut
                  open={expanded}
                >
                  {this.renderPath(nested.get(i), i)}
                </FadeInOut>
              </div>
            );
          })
        }
      </div>
    );
  }

  public render()
  {
    const { keyPath } = this.props;
    const { canEdit } = this.props.pathfinderContext;
    return (
      <div className='pf-nested-section'>
        {this.renderNestedPaths()}
        {
          keyPath.indexOf('nested') === keyPath.size - 1 && canEdit ?
            tooltip(
              <PathfinderCreateLine
                canEdit={canEdit}
                onCreate={this.handleAddNested}
                text={PathfinderText.createNestedLine}
                showText={true}
              />,
              {
                title: PathfinderText.nestedExplanation,
                arrow: false,
              },
            ) : null
        }
      </div>
    );
  }
}

export default Util.createContainer(
  PathfinderNestedSection,
  [],
  {
    builderActions: BuilderActions,
  },
);
