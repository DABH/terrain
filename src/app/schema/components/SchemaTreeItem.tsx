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

import * as React from 'react';
import { SchemaActions, SchemaStore } from '../data/SchemaStore';
import SchemaTypes from '../SchemaTypes';
import PureClasss from './../../common/components/PureClasss';
import { columnChildrenConfig, ColumnTreeInfo } from './items/ColumnTreeInfo';
import { databaseChildrenConfig, DatabaseTreeInfo } from './items/DatabaseTreeInfo';
import { indexChildrenConfig, IndexTreeInfo } from './items/IndexTreeInfo';
import { tableChildrenConfig, TableTreeInfo } from './items/TableTreeInfo';
const Radium = require('radium');
import Styles from './SchemaTreeStyles';
const ArrowIcon = require('./../../../images/icon_arrow.svg?name=ArrowIcon');
import FadeInOut from '../../common/components/FadeInOut';
import SchemaTreeList from './SchemaTreeList';

export interface Props
{
  id: ID;
  type: string;
  search: string;

  inSearchResults?: boolean;
}

class State
{
  open: boolean = false;
  item: SchemaTypes.SchemaBaseClass = null;
  childCount: number = -1;
  isSelected = false;
  isHighlighted = false;
}

const typeToRendering: {
  [type: string]: {
    component: any,
    childConfig: SchemaTypes.ISchemaTreeChildrenConfig,
    canSelect: boolean,
  },
} = {
    database:
    {
      component: DatabaseTreeInfo,
      childConfig: databaseChildrenConfig,
      canSelect: false,
    },

    table:
    {
      component: TableTreeInfo,
      childConfig: tableChildrenConfig,
      canSelect: true,
    },

    column:
    {
      component: ColumnTreeInfo,
      childConfig: columnChildrenConfig,
      canSelect: true,
    },

    index:
    {
      component: IndexTreeInfo,
      childConfig: indexChildrenConfig,
      canSelect: true,
    },
  };

@Radium
class SchemaTreeItem extends PureClasss<Props>
{
  state: State = new State();

  constructor(props: Props)
  {
    super(props);

    this._subscribe(SchemaStore, {
      stateKey: 'item',
      storeKeyPath:
      [SchemaTypes.typeToStoreKey[this.props.type], this.props.id],

      updater: (state: SchemaTypes.SchemaState) =>
      {
        if (this.state.childCount === -1) // assumes that schema data does not change
        {
          const item = state.getIn([SchemaTypes.typeToStoreKey[this.props.type], this.props.id]);
          if (item)
          {
            let childCount = 0;
            typeToRendering[item['type']].childConfig.map(
              (section) =>
                childCount += item[section.type + 'Ids'].size,
            );

            this.setState({
              childCount,
            });
          }
        }

        const isHighlighted = this.props.id === state.highlightedId
          && !!this.props.inSearchResults == state.highlightedInSearchResults;
        const isSelected = this.props.id === state.selectedId;

        if (isHighlighted !== this.state.isHighlighted || isSelected !== this.state.isSelected)
        {
          this.setState({
            isHighlighted,
            isSelected,
          });
        }
      },
    });
  }

  renderItemInfo()
  {
    const { item } = this.state;

    if (!item)
    {
      return null;
    }

    if (typeToRendering[item.type])
    {
      const Comp = typeToRendering[item.type].component;
      return (
        <Comp
          item={item}
        />
      );
    }

    return <div>No item type information</div>;
  }

  renderItemChildren()
  {
    const { item } = this.state;

    if (!this.state.open)
    {
      return null;
    }

    if (!item)
    {
      return (
        <div
          className='loading-text'
        />
      );
    }

    return (
      <div
        style={
          this.props.search ? Styles.childrenWrapper.search
            : Styles.childrenWrapper.normal
        }
      >
        {
          typeToRendering[item.type].childConfig.map(
            (childSection, index) =>
              <SchemaTreeList
                itemType={childSection.type}
                label={childSection.label}
                itemIds={item[childSection.type + 'Ids']}
                key={index}
                search={this.props.search}
              />,
          )
        }
      </div>
    );
  }

  lastHeaderClickTime: number = 0;

  handleHeaderClick()
  {
    const time = (new Date()).getTime();
    if (time - this.lastHeaderClickTime > 1000)
    {
      this.lastHeaderClickTime = time;
      const { item, isSelected } = this.state;
      if (!isSelected)
      {
        this.setState({
          isSelected: true,
          // open: !this.state.open, // need to decide whether or not to keep this in
        });
        SchemaActions.selectId(this.props.id);
      }
      else
      {
        this.setState({
          isSelected: false,
        });
        SchemaActions.selectId(null);
      }
    }

    // if(item && typeToRendering[item.type].canSelect)
    // {
    // }
    // else
    // {
    // 	// can't select
    // 	this.setState({
    // 		open: !this.state.open,
    // 	});
    // }
  }

  lastArrowClickTime: number = 0;
  handleArrowClick(event)
  {
    this.setState({
      open: !this.state.open,
    });
    event.stopPropagation();
    this.lastArrowClickTime = (new Date()).getTime();
    // used to stop triggering of double click handler
  }

  handleHeaderDoubleClick(event)
  {
    if ((new Date()).getTime() - this.lastArrowClickTime > 100)
    {
      // ^ need to double check this wasn't trigged for the arrow
      this.setState({
        open: !this.state.open,
      });
      event.stopPropagation();
    }
  }

  renderName()
  {
    const { item } = this.state;

    let nameText: string | El = <span className='loading-text' />;

    if (item)
    {
      if (this.props.search)
      {
        // show search details
        const { name } = item;
        const searchStartIndex = item.name.indexOf(this.props.search);
        const searchEndIndex = searchStartIndex + this.props.search.length;
        nameText = (
          <div>
            {
              ['table', 'database'].map(
                (type) =>
                {
                  const id = item[type + 'Id'];

                  if (id)
                  {
                    const parentItem = SchemaStore.getState().getIn([type + 's', id]);
                    return parentItem && parentItem.name + ' > ';
                  }
                },
              )
            }

            {
              name.substr(0, searchStartIndex)
            }
            <span
              style={Styles.searchTextEmphasis as any}
            >
              {
                name.substring(searchStartIndex, searchEndIndex)
              }
            </span>
            {
              name.substr(searchEndIndex)
            }
          </div>
        );
      }
      else
      {
        // show plain name
        nameText = item.name;
      }
    }

    return (
      <div
        style={Styles.name}
      >
        {
          nameText
        }
      </div>
    );
  }

  render()
  {
    const { item, isSelected, isHighlighted } = this.state;

    const showing = SchemaTypes.searchIncludes(item, this.props.search);

    return (
      <div
        style={Styles.treeItem}
      >
        <FadeInOut
          open={showing}
          key='one'
        >
          {
            showing &&
            <div
              data-rel='schema-item'
              data-id={this.props.id}
              data-search={this.props.inSearchResults}
            >
              <div
                style={[
                  Styles.treeItemHeader,
                  isHighlighted && Styles.treeItemHeaderHighlighted,
                  isSelected && Styles.treeItemHeaderSelected,
                ]}
                onClick={this.handleHeaderClick}
                onDoubleClick={this.handleHeaderDoubleClick}
              >
                <ArrowIcon
                  onClick={this.handleArrowClick}
                  style={
                    this.state.open ? Styles.arrowOpen : Styles.arrow
                  }
                />

                {
                  this.renderName()
                }

                <div
                  style={Styles.itemInfoRow as any}
                >
                  {
                    this.renderItemInfo()
                  }
                </div>
              </div>
            </div>
          }
        </FadeInOut>

        <FadeInOut
          open={this.state.open}
          key='two'
        >
          {
            this.renderItemChildren()
          }
        </FadeInOut>
      </div>
    );
  }
}

export default SchemaTreeItem;
