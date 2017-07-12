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
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';
import * as _ from 'underscore';
import './Result.less';
const { List } = Immutable;
import { _ResultsConfig, ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import { backgroundColor, borderColor, Colors, fontColor } from '../../../common/Colors';
import Menu from '../../../common/components/Menu';
import ColorManager from '../../../util/ColorManager';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';
import { spotlightAction } from '../../data/SpotlightStore';
import TerrainComponent from './../../../common/components/TerrainComponent';
import { MAX_RESULTS, Result } from './ResultsManager';

const PinIcon = require('./../../../../images/icon_pin_21X21.svg?name=PinIcon');
const ScoreIcon = require('./../../../../images/icon_terrain_27x16.svg?name=ScoreIcon');

const MAX_DEFAULT_FIELDS = 4;

export interface Props
{
  result: Result;

  resultsConfig: ResultsConfig;
  index: number;
  primaryKey: string;
  onExpand: (index: number) => void;
  expanded?: boolean;

  isOver?: boolean;
  isDragging?: boolean;
  connectDragSource?: (a: any) => any;
  connectDropTarget?: (a: any) => any;
  connectDragPreview?: (a: any) => void;
}

@Radium
class ResultComponent extends TerrainComponent<Props> {
  // state: {
  //   isSpotlit: boolean;
  //   spotlightColor: string;
  // } = {
  //   isSpotlit: false,
  //   spotlightColor: "",
  // };

  public menuOptions =
  [
    List([
      {
        text: 'Spotlight',
        onClick: this.spotlight,
      },
    ]),

    List([
      {
        text: 'Un-Spotlight',
        onClick: this.unspotlight,
      },
    ]),
  ];

  public shouldComponentUpdate(nextProps: Props, nextState)
  {
    for (const key in nextProps)
    {
      if (key !== 'result' && this.props[key] !== nextProps[key])
      {
        return true;
      }
    }

    if (!_.isEqual(this.props.result.toJS(), nextProps.result.toJS()))
    {
      return true;
    }

    return false;
  }

  public renderExpandedField(value, field)
  {
    return this.renderField(field, 0, null, {
      showField: true,
      showRaw: true,
    });
  }

  public renderField(field, index?, fields?, overrideFormat?)
  {
    if (!resultsConfigHasFields(this.props.resultsConfig) && index >= MAX_DEFAULT_FIELDS)
    {
      return null;
    }

    const value = getResultValue(this.props.result, field, this.props.resultsConfig, overrideFormat);
    const format = this.props.resultsConfig && this.props.resultsConfig.formats.get(field);
    const showField = overrideFormat ? overrideFormat.showField : (!format || format.type === 'text' || format.showField);
    return (
      <div
        className='result-field'
        key={field}
        style={borderColor(Colors().builder.results.lines)}
      >
        {
          showField &&
          <div
            className='result-field-name'
            style={fontColor(Colors().text.thirdLight)}
          >
            {
              field
            }
          </div>
        }
        <div
          className={classNames({
            'result-field-value': true,
            'result-field-value-short': (field + value).length < 0,
            'result-field-value-number': typeof value === 'number',
          })}
        >
          {
            value
          }
        </div>
      </div>
    );
  }

  public spotlight()
  {
    const id = this.props.primaryKey;
    const spotlightColor = ColorManager.altColorForKey(id);
    this.setState({
      isSpotlit: true,
      spotlightColor,
    });

    const spotlightData = this.props.result.toJS();
    spotlightData['name'] = getResultName(this.props.result, this.props.resultsConfig);
    spotlightData['color'] = spotlightColor;
    spotlightData['id'] = id;
    spotlightAction(id, spotlightData);
  }

  public unspotlight()
  {
    this.setState({
      isSpotlit: false,
    });
    spotlightAction(this.props.primaryKey, null);
  }

  public renderSpotlight()
  {
    if (!this.props.result.spotlight)
    {
      return null;
    }

    return (
      <div
        className='result-spotlight'
        style={{
          background: this.state.spotlightColor,
        }}
      />
    );
  }

  public expand()
  {
    this.props.onExpand(this.props.index);
  }

  public render()
  {
    const { isDragging, connectDragSource, isOver, connectDropTarget, resultsConfig, result } = this.props;

    const classes = classNames({
      'result': true,
      'result-expanded': this.props.expanded,
      'result-dragging': isDragging,
      'result-drag-over': isOver,
    });

    let scoreArea: any;

    if (resultsConfig && resultsConfig.score && resultsConfig.enabled)
    {
      scoreArea = (
        <div className='result-score'>
          {
            this.renderField(resultsConfig.score)
          }
        </div>
      );
    }

    const name = getResultName(result, resultsConfig);
    const fields = getResultFields(result, resultsConfig);
    const configHasFields = resultsConfigHasFields(resultsConfig);

    let bottomContent: any;

    if (!configHasFields && fields.length > 4 && !this.props.expanded)
    {
      bottomContent = (
        <div className='result-bottom' onClick={this.expand}>
          {fields.length - MAX_DEFAULT_FIELDS} more field{fields.length - 4 === 1 ? '' : 's'}
        </div>
      );
    }

    let expandedContent: any;
    if (this.props.expanded)
    {
      expandedContent = (
        <div className='result-expanded-fields'>
          <div className='result-expanded-fields-title'>
            All Fields
          </div>
          {
            result.fields.map(
              (value, key) =>
                this.renderExpandedField(value, key),
            )
          }
        </div>
      );
    }

    return ((
      <div
        className={classes}
        onDoubleClick={this.expand}
      >
        <div
          className='result-inner'
          style={[
            borderColor(Colors().builder.results.lines),
            backgroundColor(Colors().builder.results.background),
          ]}
        >
          <div className='result-name'>
            <div
              className='result-name-inner'
              style={fontColor(Colors().text.baseLight)}
            >
              {
                this.renderSpotlight()
              }
              <div className='result-pin-icon'>
                <PinIcon />
              </div>
              {
                name
              }
            </div>
          </div>

          <Menu
            options={
              this.menuOptions[result.spotlight ? 1 : 0]
            }
          />

          {
            scoreArea
          }

          <div className='result-fields-wrapper'>
            {
              _.map(fields, this.renderField)
            }
            {
              bottomContent
            }
            {
              expandedContent
            }
          </div>
        </div>
      </div>
    ));
  }
}
export function getResultValue(result: Result, field: string, config: ResultsConfig, overrideFormat?: any): string
{
  let value: any;
  if (result)
  {
    value = result.fields.get(field);
  }
  return ResultFormatValue(field, value, config, overrideFormat);
}

export function resultsConfigHasFields(config: ResultsConfig): boolean
{
  return config && config.enabled && config.fields && config.fields.size > 0;
}

export function getResultFields(result: Result, config: ResultsConfig): string[]
{
  let fields: string[];

  if (resultsConfigHasFields(config))
  {
    fields = config.fields.toArray();
  }
  else
  {
    fields = result.fields.keySeq().toArray();
  }

  return fields;
}

export function getResultName(result: Result, config: ResultsConfig)
{
  let nameField: string;

  if (config && config.name && config.enabled)
  {
    nameField = config.name;
  }
  else
  {
    nameField = _.first(getResultFields(result, config));
  }

  return getResultValue(result, nameField, config);
}

export function ResultFormatValue(field: string, value: string | number, config: ResultsConfig, overrideFormat?: any): any
{
  const format = config && config.enabled && config.formats && config.formats.get(field);
  const { showRaw } = overrideFormat || format || { showRaw: false };
  let italics = false;
  if (value === undefined)
  {
    value = 'undefined';
    italics = true;
  }
  if (typeof value === 'boolean')
  {
    value = value ? 'true' : 'false';
    italics = true;
  }
  if (typeof value === 'string' && !value.length)
  {
    value = '"" (blank)';
    italics = true;
  }
  if (value === null)
  {
    value = 'null';
    italics = true;
  }

  if (format)
  {
    switch (format.type)
    {
      case 'image':
        const url = format.template.replace(/\[value\]/g, value as string);
        return (
          <div
            className='result-field-value-image-wrapper'
          >
            <div
              className='result-field-value-image'
              style={{
                backgroundImage: `url(${url})`,
                // give the div the background image, to make use of the "cover" CSS positioning,
                // but also include the <img> tag below (with opacity 0) so that right-click options still work
              }}
            >
              <img src={url} />
            </div>
            <div className='result-field-value'>
              {
                showRaw ? value : null
              }
            </div>
          </div>
        );

      case 'text':

        break;
    }
  }

  if (typeof value === 'number')
  {
    value = Math.floor((value as number) * 10000) / 10000;
    value = value.toLocaleString();
  }

  if (italics)
  {
    return <em>{value}</em>;
  }

  return value;
}

export default ResultComponent;

// DnD stuff

// Defines a draggable result functionality
// const resultSource =
// {
//   canDrag(props)
//   {
//     return false; // TODO remove once we get result dragging and pinning working
//     // return props.canDrag;
//   },

//   beginDrag(props)
//   {
//     const item = props.result;
//     return item;
//   },

//   endDrag(props, monitor, component)
//   {
//     if(!monitor.didDrop())
//     {
//       return;
//     }

//     const item = monitor.getItem();
//     const dropResult = monitor.getDropResult();
//   }
// }

// // Defines props to inject into the component
// const dragCollect = (connect, monitor) =>
// ({
//   connectDragSource: connect.dragSource(),
//   isDragging: monitor.isDragging(),
//   connectDragPreview: connect.dragPreview()
// });

// const resultTarget =
// {
//   canDrop(props, monitor)
//   {
//     return true;
//   },

//   hover(props, monitor, component)
//   {
//     const canDrop = monitor.canDrop();
//   },

//   drop(props, monitor, component)
//   {
//     const item = monitor.getItem();
//     // TODO
//     // Actions.results.move(item, props.index);
//   }
// }

// const dropCollect = (connect, monitor) =>
// ({
//   connectDropTarget: connect.dropTarget(),
//   isOver: monitor.isOver(),
//   isOverCurrent: monitor.isOver({ shallow: true }),
//   canDrop: monitor.canDrop(),
//   itemType: monitor.getItemType()
// });

// export default DropTarget('RESULT', resultTarget, dropCollect)(DragSource('RESULT', resultSource, dragCollect)(Result));
