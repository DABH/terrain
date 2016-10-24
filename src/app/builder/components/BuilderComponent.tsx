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

require('./BuilderComponent.less');

import * as React from 'react';
import * as Immutable from 'immutable';
import {Display, DisplayType} from './../BuilderDisplays.tsx';
import PureClasss from '../../common/components/PureClasss.tsx';
import BuilderTextbox from '../../common/components/BuilderTextbox.tsx';
import BuilderTypes from '../BuilderTypes.tsx';
import BuilderActions from '../data/BuilderActions.tsx';
import CardField from './cards/CardField.tsx';
import Dropdown from '../../common/components/Dropdown.tsx';
import CardsArea from './cards/CardsArea.tsx';
import BuilderTextboxCards from '../../common/components/BuilderTextboxCards.tsx';
import ManualInfo from '../../manual/components/ManualInfo.tsx';
import * as classNames from 'classnames';

interface Props
{
  keyPath: KeyPath;
  data: any; // record
  display?: Display | Display[];
  
  keys: List<string>;
  canEdit: boolean;
  
  parentData?: any;

  helpOn?: boolean;

  addColumn?: (number, string?) => void;
  columnIndex?: number;
  // provide parentData if necessary but avoid if possible
  // as it will cause re-renders
}

class BuilderComponent extends PureClasss<Props>
{
  _addRow(keyPath: KeyPath, display: Display)
  {
    return this._fn('addRow', keyPath, display, (index: number) => {
      BuilderActions.create(keyPath, index, display.factoryType);
    });
  }
  _removeRow(keyPath: KeyPath, index: number, display: Display)
  {
    return this._fn('removeRow', keyPath, index, display, () => {
      BuilderActions.remove(keyPath, index);
    });
  }
  _moveRow(keyPath: KeyPath)
  {
    return this._fn('moveRow', keyPath,
      (index: number, newIndex: number) =>
        BuilderActions.move(keyPath, index, newIndex)
    );
  }
  
  renderDisplay(
    displayArg: Display | Display[],
    parentKeyPath: KeyPath,
    data: Map<any, any>, 
    options?: {
      className: string;
    }
  ): (El | El[])
  {
    let keySeed = parentKeyPath.join(",");
    if(Array.isArray(displayArg))
    {
      return displayArg.map(di => 
          <BuilderComponent
            display={di}
            keyPath={parentKeyPath}
            data={data}
            canEdit={this.props.canEdit}
            keys={this.props.keys}
            parentData={this.props.parentData}
            helpOn={this.props.helpOn}
            addColumn={this.props.addColumn}
            columnIndex={this.props.columnIndex}
          />
        ) as El[];
      // return displayArg.map(di => this.renderDisplay(di, parentKeyPath, data)) as El[];
    }
    
    const d = displayArg as Display;
    var className = '';
    if(d.className)
    {
      if(typeof d.className === 'function')
      {
        className = (d.className as (d:any)=>string)(data);
      }
      else
      {
        className = d.className as string;
      }
    }
    
    if(options && options.className)
    {
      className += ' ' + options.className;
    }
    
    if(d.displayType === DisplayType.LABEL)
    {
      // special type that is unrealted to the data
      return <div 
        className='builder-label'
        key={keySeed + '-label'}
        >
          {d.label}
        </div>
      ;
    }
    
    let keyPath = this._ikeyPath(parentKeyPath, d.key);
    let value = data.get(d.key);
    var isNumber = false, typeErrorMessage = null;
    var isTextbox = false;
    var acceptsCards = false;
    let key = data.get('id') + ',' + d.key;
    
    var content;
    switch(d.displayType)
    {
      case DisplayType.NUM:
        isNumber = true;
        typeErrorMessage = "Must be a number";
        isTextbox = true;
        break;
      case DisplayType.TEXT:
        isTextbox = true;
        break;
      case DisplayType.CARDS:
        var st = data.get('static');
        content = <CardsArea 
          keys={this.props.keys}
          canEdit={this.props.canEdit}
          key={key}
          cards={value} 
          keyPath={keyPath}
          className={className}
          helpOn={this.props.helpOn}
          addColumn={this.props.addColumn}
          columnIndex={this.props.columnIndex}
          accepts={st && st.accepts}
          singleChild={d.singleChild}
        />;
      break;
      case DisplayType.CARDTEXT:
        isTextbox = true;
        acceptsCards = true;
      break;
      case DisplayType.CARDSFORTEXT:
        content = <BuilderTextboxCards
          value={value}
          canEdit={this.props.canEdit}
          keyPath={keyPath}
          keys={this.props.keys}
          key={key + 'cards'}
          className={className}
          helpOn={this.props.helpOn}
          addColumn={this.props.addColumn}
          columnIndex={this.props.columnIndex}
          display={d}
        />;
      break;
      case DisplayType.DROPDOWN:
        content = (
          <div key={key} className='builder-component-wrapper'>
            <Dropdown
              canEdit={this.props.canEdit}  
              className={className}
              keyPath={keyPath}
              options={d.options}
              selectedIndex={value}
              centerAlign={d.centerDropdown}
            />
            { this.props.helpOn && d.help ?
              <ManualInfo
                information={d.help as string}
                className='builder-component-help-right'
              />
              : null
            }  
          </div>
        );
      break;
      case DisplayType.FLEX:
        content = (
          <div
            key={key}
          >
            { !d.above ? null : 
              <BuilderComponent
                display={d.above}
                keyPath={this.props.keyPath}
                data={data}
                canEdit={this.props.canEdit}
                keys={this.props.keys}
                parentData={this.props.parentData}
              />
            }
            <div
              className='card-flex'
            >
              <BuilderComponent
                display={d.flex}
                keyPath={this.props.keyPath}
                data={data}
                canEdit={this.props.canEdit}
                keys={this.props.keys}
                parentData={this.props.parentData}
                helpOn={this.props.helpOn}
                addColumn={this.props.addColumn}
                columnIndex={this.props.columnIndex}
              />
            </div>
            { !d.below ? null : 
              <div
                className='card-flex-below'
              >
                <BuilderComponent
                  display={d.below}
                  keyPath={this.props.keyPath}
                  data={data}
                  canEdit={this.props.canEdit}
                  keys={this.props.keys}
                  parentData={this.props.parentData}
                  helpOn={this.props.helpOn}
                  addColumn={this.props.addColumn}
                  columnIndex={this.props.columnIndex}
                />
              </div>
            }
          </div>
        );
      break;
      case DisplayType.ROWS:
        content = (
          <div
            key={key}
            className={'card-fields ' + className}
          >
            {
              value.map((v, i) => (
                <CardField
                  index={i}
                  onAdd={this._addRow(keyPath, d)}
                  onRemove={this._removeRow(keyPath, i, d)}
                  onMove={this._moveRow(keyPath)}
                  key={key + ',' + v.get('id')}
                  isSingle={value.size === 1}
                  
                  row={d.row}
                  keyPath={this._ikeyPath(keyPath, i)}
                  data={v}
                  canEdit={this.props.canEdit}
                  keys={this.props.keys}
                  parentData={d.provideParentData && data}
                  helpOn={this.props.helpOn}
                  addColumn={this.props.addColumn}
                  columnIndex={this.props.columnIndex}
                  isFirstRow={i === 0}
                  isOnlyRow={value.size === 1}
                />
              ))
            }
          </div>
        );
        break;
      case DisplayType.COMPONENT:
        let Comp = d.component;
        // content = React.cloneElement(<Comp />, {
        //   key,
        //   keyPath,
        //   data,
        //   parentData: this.props.parentData,
        //   canEdit: this.props.canEdit,
        //   keys: this.props.keys,
        //   className,
        // });
        var isTransformCard = d.key === 'scorePoints';
        content = (
          <div 
            key={key} 
            className='builder-component-wrapper builder-component-wrapper-wide'
          >
            {React.cloneElement(<Comp />, {
              keyPath,
              data,
              parentData: this.props.parentData,
              canEdit: this.props.canEdit,
              keys: this.props.keys,
              helpOn: this.props.helpOn,
              className,
            })}
            { this.props.helpOn && d.help ?
              (
                isTransformCard ?
                (d.help as string[]).map((info, index) => {
                  return <ManualInfo 
                    information={info as string}
                    wide={index === 0}
                    key={'info' + index}
                    leftSide={index===2}
                    className={classNames({
                      'builder-component-help-transform-center': index === 0,
                      'builder-component-help-transform-left': index === 1,
                      'builder-component-help-transform-bottom': index === 2 
                    })}
                  /> 
                })
                :
                <ManualInfo 
                  information={d.help as string}
                  className='builder-component-help-right'
                /> 
              )
              : null
            }
          </div>
          );
      break;
      default:
        content = (
          <div key={key}>Data type {DisplayType[d.displayType]} not implemented.</div>
        );
    }
    
    if(isTextbox)
    {
      content = (
        <div 
          key={key} 
          className='builder-component-wrapper builder-component-wrapper-wide'
        >
        <BuilderTextbox
          keys={
            d.autoDisabled ? null :
              d.getAutoTerms ? d.getAutoTerms(this) : this.props.keys
          }
          canEdit={this.props.canEdit}
          top={d.top}
          placeholder={d.placeholder || d.key}
          showWhenCards={d.showWhenCards}
          onFocus={d.onFocus}
          onBlur={d.onBlur}
          display={d}
          {...{
            keyPath,
            value,
            acceptsCards,
            isNumber,
            typeErrorMessage,
            className,
          }}
        />
        {
          this.props.helpOn && d.help ?
          <ManualInfo 
            information={d.help as string}
            className='builder-component-help-right'
          />
          : null
        }
        </div>
      );
    }
    
    if(!d.header)
    {
      return content;
    }
    
    return (
      <div key={key}>
        <div
          className={'builder-card-header ' + (d.headerClassName ? d.headerClassName : '')}
          style={{
            backgroundColor: this.props.data.static.colors[0],
          }}
        >
          {
            d.header
          }
        </div>
        { 
          content
        }
      </div>
    );
  }
  
  render()
  {
    // if(!this.state || !this.state['render'])
    // {
    //   setTimeout(() => this.setState({ render: true, }), 1000);
    //   return null;
    // }
    
    var {data, display} = this.props;
    if(!display)
    {
      if(!data.static || !data.static.display)
      {
        throw new Error("Insufficient props supplied to BuilderComponent");
      }
      
      display = data.static.display;
    }
    
    if(Array.isArray(display))
    {
      return (
        <div
          className='builder-comp-list'
        >
          {
            display.map((d, i) => this.renderDisplay(
              d,
              this.props.keyPath,
              this.props.data,
              {
                className: 'builder-comp-list-item',
              }
              )
            )
          }
        </div>
      );
    }
    else
    {
      return this.renderDisplay(
        display,
        this.props.keyPath,
        this.props.data
      ) as El;
    }
  }
}

export default BuilderComponent;