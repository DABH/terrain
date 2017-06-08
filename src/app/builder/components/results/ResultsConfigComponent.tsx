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
import * as Immutable from 'immutable';
import './ResultsConfigStyle.less';
const { List, Map } = Immutable;
import * as classNames from 'classnames';
import * as React from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import * as _ from 'underscore';
import { _Format, _ResultsConfig, Format, ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import InfoArea from '../../../common/components/InfoArea';
import Ajax from '../../../util/Ajax';
import Util from '../../../util/Util';
import Result from '../results/Result';
import PureClasss from './../../../common/components/PureClasss';
import Switch from './../../../common/components/Switch';
import { MAX_RESULTS, Results } from './ResultsManager';

const CloseIcon = require('./../../../../images/icon_close_8x8.svg?name=CloseIcon');
const GearIcon = require('./../../../../images/icon_gear.svg?name=GearIcon');
const TextIcon = require('./../../../../images/icon_text_12x18.svg?name=TextIcon');
const ImageIcon = require('./../../../../images/icon_profile_16x16.svg?name=ImageIcon');
const HandleIcon = require('./../../../../images/icon_handle.svg?name=HandleIcon');

export interface Props
{
  fields: List<string>;
  config: ResultsConfig;
  onConfigChange: (config: ResultsConfig) => void;
  onClose: () => void;
}

export class ResultsConfigComponent extends PureClasss<Props>
{
  public state: {
    lastHover: { index: number, field: string },
    config: ResultsConfig;
  } = {
    lastHover: { index: null, field: null },
    config: null,
  };

  constructor(props: Props)
  {
    super(props);
    this.state.config = props.config;
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.config !== this.props.config)
    {
      this.setState({
        config: nextProps.config,
      });
    }
  }

  public handleDrop(type: string, field: string, index?: number)
  {
    if (this.state.lastHover.field === field && index === undefined && type === 'field')
    {
      this.setState({
        lastHover: { index: null, field: null },
      });
      return;
    }

    let { config } = this.state;

    // remove if already set
    if (config.name === field)
    {
      config = config.set('name', null);
    }
    if (config.score === field)
    {
      config = config.set('score', null);
    }
    if (config.fields.indexOf(field) !== -1)
    {
      config = config.set('fields',
        config.fields.splice(config.fields.indexOf(field), 1),
      );
    }

    // set if needed
    if (type === 'field')
    {
      if (index !== undefined)
      {
        config = config.set('fields', config.fields.splice(index, 0, field));
      }
      else
      {
        config = config.set('fields', config.fields.push(field));
      }
    }
    else if (type != null)
    {
      config = config.set(type, field);
    }

    this.changeConfig(config);

    if (index === undefined)
    {
      this.setState({
        lastHover: { index: null, field: null },
      });
    }
  }

  public changeConfig(config: ResultsConfig)
  {
    this.setState({
      config,
    });
  }

  public handleEnabledToggle()
  {
    this.changeConfig(this.state.config.set('enabled', !this.state.config.enabled));
  }

  public fieldType(field)
  {
    const { config } = this.state;
    if (!config)
    {
      return null;
    }
    if (config.name === field)
    {
      return 'name';
    }
    if (config.score === field)
    {
      return 'score';
    }
    if (config.fields.indexOf(field) !== -1)
    {
      return 'field';
    }
    return null;
  }

  public handleFieldHover(index: number, field: string)
  {
    if (this.state.lastHover.index !== index || this.state.lastHover.field !== field)
    {
      this.setState({
        lastHover: { index, field },
      });
      this.handleDrop('field', field, index);
    }
  }

  public handleRemove(field: string)
  {
    this.handleDrop(null, field);
  }

  public handleFormatChange(field: string, format: Format)
  {
    this.changeConfig(
      this.state.config.setIn(['formats', field], format),
    );
  }

  public handleClose()
  {
    this.props.onConfigChange(this.state.config);
    this.props.onClose();
  }

  public handlePrimaryKeysChange(primaryKeys: List<string>)
  {
    this.changeConfig(
      this.state.config.set('primaryKeys', primaryKeys),
    );
  }

  public render()
  {
    const { config } = this.state;
    const { enabled, formats } = config;

    return (
      <div className='results-config-wrapper'>
        <div className={classNames({
          'results-config': true,
          'results-config-disabled': !enabled,
        })}>
          <div className='results-config-bar'>
            <div className='results-config-title'>
              Configure Results View
            </div>
            <div className='results-config-switch'>
              <Switch
                first='Enabled'
                second='Disabled'
                onChange={this.handleEnabledToggle}
                selected={enabled ? 1 : 2}
              />
            </div>
            <div className='results-config-button' onClick={this.handleClose}>
              Done
            </div>
          </div>
          <div className='results-config-config-wrapper'>
            <div className='results-config-instructions'>
              Drag fields to/from the sample result below to customize
              how this algorithm's results look in the Builder.
            </div>
            <div className='results-config-config'>
              <CRTarget
                className='results-config-name'
                type='name'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title'>
                  Name
                </div>
                {
                  config && config.name ?
                    <ResultsConfigResult
                      field={config.name}
                      is='score'
                      onRemove={this.handleRemove}
                      format={formats.get(config.name)}
                      onFormatChange={this.handleFormatChange}
                      primaryKeys={config.primaryKeys}
                      onPrimaryKeysChange={this.handlePrimaryKeysChange}
                    />
                    :
                    <div className='results-config-placeholder'>
                      Drag name field <em>(optional)</em>
                    </div>
                }
              </CRTarget>
              <CRTarget
                className='results-config-score'
                type='score'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title'>
                  Score
                </div>
                {
                  config && config.score ?
                    <ResultsConfigResult
                      field={config.score}
                      is='score'
                      onRemove={this.handleRemove}
                      format={formats.get(config.score)}
                      onFormatChange={this.handleFormatChange}
                      primaryKeys={config.primaryKeys}
                      onPrimaryKeysChange={this.handlePrimaryKeysChange}
                    />
                    :
                    <div className='results-config-placeholder'>
                      Drag score field <em>(optional)</em>
                    </div>
                }
              </CRTarget>
              <CRTarget
                className='results-config-fields'
                type='field'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title'>
                  Fields
                </div>
                {
                  config && config.fields.map((field, index) =>
                    <div className='results-config-field-wrapper' key={field}>
                      <ResultsConfigResult
                        field={field}
                        is='field'
                        index={index}
                        onHover={this.handleFieldHover}
                        draggingField={this.state.lastHover.field}
                        onRemove={this.handleRemove}
                        format={formats.get(field)}
                        onFormatChange={this.handleFormatChange}
                        primaryKeys={config.primaryKeys}
                        onPrimaryKeysChange={this.handlePrimaryKeysChange}
                      />
                    </div>,
                  )
                }
                <div className='results-config-placeholder'>
                  Drag more fields here
                </div>
              </CRTarget>
            </div>
          </div>
          <CRTarget
            className='results-config-available-fields'
            type={null}
            onDrop={this.handleDrop}
          >
            {
              this.props.fields.map((field) =>
                <ResultsConfigResult
                  key={field}
                  field={field}
                  is={this.fieldType(field)}
                  isAvailableField={true}
                  onRemove={this.handleRemove}
                  format={formats.get(field)}
                  onFormatChange={this.handleFormatChange}
                  primaryKeys={config.primaryKeys}
                  onPrimaryKeysChange={this.handlePrimaryKeysChange}
                />,
              )
            }
          </CRTarget>
          <div className='results-config-disabled-veil'>
            <div className='results-config-disabled-veil-inner'>
              <b>Custom results view is off.</b>
              Results will display the information returned from the query.
            </div>
          </div>
        </div>
      </div>
    );
  }
}

interface ResultsConfigResultProps
{
  field: string;
  is?: string; // 'title', 'score', 'field', or null
  onHover?: (index: number, field: string) => void;
  index?: number;
  connectDragSource?: (a: any) => any;
  connectDropTarget?: (a: any) => any;
  isDragging?: boolean;
  draggingField?: string;
  isAvailableField?: boolean;
  onRemove: (field: any) => void;
  format: Format;
  onFormatChange: (field: string, format: Format) => void;
  primaryKeys: List<string>;
  onPrimaryKeysChange: (primaryKeys: List<string>) => void;
}
class ResultsConfigResultC extends PureClasss<ResultsConfigResultProps>
{
  public state: {
    showFormat: boolean;
  } = {
    showFormat: false,
  };

  public handleRemove()
  {
    this.props.onRemove(this.props.field);
  }

  public toggleShowFormat()
  {
    this.setState({
      showFormat: !this.state.showFormat,
    });
  }

  public changeToText()
  {
    this.changeFormat('type', 'text');
  }

  public changeToImage()
  {
    this.changeFormat('type', 'image');
  }

  public toggleRaw(event)
  {
    this.changeFormat('showRaw', event.target.checked);
  }

  public toggleField(event)
  {
    this.changeFormat('showField', event.target.checked);
  }

  public handleTemplateChange(event)
  {
    this.changeFormat('template', event.target.value);
  }

  public changeFormat(key: string, val: any)
  {
    const format = this.props.format || _Format({
      type: 'text',
      template: '',
      showRaw: false,
      showField: true,
    });

    this.props.onFormatChange(this.props.field,
      format.set(key, val),
    );
  }

  public handlePrimaryKeyChange()
  {
    let { primaryKeys } = this.props;
    if (primaryKeys.contains(this.props.field))
    {
      primaryKeys = primaryKeys.remove(primaryKeys.indexOf(this.props.field));
    }
    else
    {
      primaryKeys = primaryKeys.push(this.props.field);
    }
    this.props.onPrimaryKeysChange(primaryKeys);
  }

  public render()
  {
    const { format } = this.props;
    const image = format && format.type === 'image';

    return this.props.connectDropTarget(this.props.connectDragSource(
      <div className={classNames({
        'results-config-field': true,
        'results-config-field-dragging': this.props.isDragging ||
        (this.props.draggingField && this.props.draggingField === this.props.field),
        'results-config-field-name': this.props.is === 'name',
        'results-config-field-score': this.props.is === 'score',
        'results-config-field-field': this.props.is === 'field',
        'results-config-field-used': this.props.is !== null && this.props.isAvailableField,
      })}>
        <div className='results-config-field-body'>
          <span className='results-config-handle'>
            <HandleIcon />
          </span>
          <span className='results-config-text'>
            {
              this.props.field
            }
          </span>
          {
            this.props.is !== null ?
              <CloseIcon
                className='close'
                onClick={this.handleRemove}
              />
              : null
          }
          <GearIcon
            className='results-config-field-gear'
            onClick={this.toggleShowFormat}
          />
        </div>

        <div className={classNames({
          'results-config-field-format': true,
          'results-config-field-format-showing': this.state.showFormat,
          'results-config-field-format-text': !image,
          'results-config-field-format-image': image,
        })}>
          <div className='results-config-format-header'>
            <input
              type='checkbox'
              checked={this.props.primaryKeys.contains(this.props.field)}
              onChange={this.handlePrimaryKeyChange}
              id={'primaryKey-' + this.props.field}
              className='rcf-primary-key-input'
            />
            <label
              htmlFor={'primaryKey-' + this.props.field}
              className='rcf-primary-key-label'
            >
              {this.props.field} is a primary key
            </label>
          </div>
          <div className='results-config-format-header'>
            Display the value of {this.props.field} as:
          </div>
          <div className='results-config-format-btns'>
            <div className='results-config-text-btn' onClick={this.changeToText}>
              <TextIcon /> Text
            </div>
            <div className='results-config-image-btn' onClick={this.changeToImage}>
              <ImageIcon /> Image
            </div>
          </div>

          <div className='results-config-image'>
            <div>
              <b>Image URL Template</b>
            </div>
            <div>
              <input
                type='text'
                value={format ? format.template : ''}
                onChange={this.handleTemplateChange}
                placeholder={'http://web.com/img/[value].png'}
              />
            </div>
            <div>
              <em>"[value]" inserts the value of {this.props.field}</em>
            </div>
            <div className='results-config-field-value'>
              <input
                type='checkbox'
                id={'check-f-' + this.props.field}
                checked={format && format.showField}
                onChange={this.toggleField}
                value={'' /* can remove when updated to newest React */}
              />
              <label htmlFor={'check-f-' + this.props.field}>
                Show field name label
              </label>
            </div>
            <div className='results-config-raw-value'>
              <input
                type='checkbox'
                id={'check-' + this.props.field}
                checked={!!format && format.showRaw}
                onChange={this.toggleRaw}
                value={'' /* can remove when updated to newest React */}
              />
              <label htmlFor={'check-' + this.props.field}>
                Show raw value, as well
              </label>
            </div>
          </div>
        </div>
      </div>,
    ));
  }
}
// Defines a draggable result functionality
const resultSource =
  {
    beginDrag(props)
    {
      return props;
    },

    endDrag(props, monitor, component)
    {
      if (!monitor.didDrop())
      {
        return;
      }

      const item = monitor.getItem();
      const dropResult = monitor.getDropResult();
    },
  };

// Defines props to inject into the component
const dragCollect = (connect, monitor) =>
  ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
    connectDragPreview: connect.dragPreview(),
  });

const resultTarget =
  {
    canDrop(props, monitor)
    {
      return false;
    },

    hover(props, monitor, component)
    {
      if (!props.isAvailableField && props.onHover)
      {
        props.onHover(props.index, monitor.getItem().field);
      }
    },

    drop(props, monitor, component)
    {
    },
  };

const resultDropCollect = (connect, monitor) =>
  ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  });

const ResultsConfigResult = DropTarget('RESULTCONFIG', resultTarget, resultDropCollect)(DragSource('RESULTCONFIG', resultSource, dragCollect)(ResultsConfigResultC));

interface CRTargetProps
{
  type: string;
  onDrop: (type: string, field: string) => void;
  className: string;
  connectDropTarget?: (a: any) => any;
  children?: any;
  isOver?: boolean;
}
class CRTargetC extends PureClasss<CRTargetProps>
{
  public render()
  {
    return this.props.connectDropTarget(
      <div className={this.props.className + (this.props.isOver ? ' results-config-over' : '')}>
        {this.props.children}
      </div>,
    );
  }
}

const crTarget =
  {
    canDrop(props, monitor)
    {
      return true;
    },

    hover(props, monitor, component)
    {
      const canDrop = monitor.canDrop();
    },

    drop(props, monitor, component)
    {
      const item = monitor.getItem();
      props.onDrop(props.type, item.field);
    },
  };

const crDropCollect = (connect, monitor) =>
  ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  });

const CRTarget = DropTarget('RESULTCONFIG', crTarget, crDropCollect)(CRTargetC);

export default ResultsConfigComponent;
