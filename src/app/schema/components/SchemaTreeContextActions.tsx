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

// tslint:disable:strict-boolean-expressions
import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import * as React from 'react';
import { SchemaActions } from 'schema/data/SchemaRedux';
import * as SchemaTypes from '../SchemaTypes';
import TerrainComponent from './../../common/components/TerrainComponent';

const Radium = require('radium');
import Styles from './SchemaTreeStyles';
const ArrowIcon = require('./../../../images/icon_arrow.svg?name=ArrowIcon');
import Util from 'util/Util';
import FadeInOut from '../../common/components/FadeInOut';
import { fieldPropertyChildrenConfig, FieldPropertyTreeInfo } from './items/FieldPropertyTreeInfo';
import SchemaTreeList from './SchemaTreeList';

import ExpandableView from 'common/components/ExpandableView';
import Menu from 'common/components/Menu';

import './SchemaTreeContextActions.less';

export interface Props
{
  id: ID;
  type: string;
  // injected props
  schema?: SchemaTypes.SchemaState;
  schemaActions?: typeof SchemaActions;
}

@Radium
class SchemaTreeContextActions extends TerrainComponent<Props>
{
  private typeToRendering = {
    server: this.renderDefault,
    database: this.renderDatabase,
    table: this.renderDefault,
    column: this.renderDefault,
    fieldProperty: this.renderDefault,
    index: this.renderDefault,
  }

  private elasticMenuOptions = List([
    {
      text: 'Delete Index',
      onClick: this.requestDeleteIndex,
    }
  ]);

  public renderDefault()
  {
    return null;
  }

  public renderDatabase()
  {
    const { schema, id } = this.props;
    const db = schema.databases.get(id as string);

    switch (db.databaseType)
    {
      case 'elastic': {
        return (
          <div
            className='schema-tree-context-wrapper'
          >
            <Menu
              options={this.elasticMenuOptions}
              small={true}
            />
          </div>
        )
      }
      default:
        return null;
    }
  }

  public render()
  {
    const renderFn = this.typeToRendering[this.props.type];

    if (renderFn !== undefined)
    {
      return renderFn();
    }
    else
    {
      return null;
    }
  }

  public requestDeleteIndex()
  {

  }
}

export default Util.createTypedContainer(
  SchemaTreeContextActions,
  ['schema'],
  { schemaActions: SchemaActions },
);
