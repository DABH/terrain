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
// tslint:disable:no-var-requires import-spacing strict-boolean-expressions

import * as classNames from 'classnames';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { Colors, fontColor } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import Menu from 'common/components/Menu';
import { TemplateField } from 'etl/templates/FieldTypes';
import LanguageController from 'shared/etl/languages/LanguageControllers';
import { ETLFieldTypes } from 'shared/etl/types/ETLTypes';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import { instanceFnDecorator } from 'shared/util/Classes';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './TemplateEditorField.less';

const KeyIcon = require('images/icon_key-2.svg');
const MAX_STRING_LENGTH = 400;

export interface Props extends TemplateEditorFieldProps
{
  toggleOpen?: () => void;
  labelOnly?: boolean;
  labelOverride?: string;
}

@Radium
class EditorFieldPreview extends TemplateEditorField<Props>
{
  public state: {
    hovered: boolean;
    menuOpen: boolean;
  } = {
      hovered: false,
      menuOpen: false,
    };

  @instanceFnDecorator(memoizeOne)
  public menuOptions(field: TemplateField)
  {
    const options = [];

    if (field.canEditField() || field.canTransformField())
    {
      options.push({
        text: `${field.canEditField() ? 'Edit' : 'Transform'} this Field`,
        onClick: this.openSettings,
      });
    }
    if (field.etlType === ETLFieldTypes.Object)
    {
      options.push({
        text: 'Add a subfield',
        onClick: this.requestAddField,
      });
    }
    if (field.canMoveField())
    {
      options.push({
        text: 'Move this Field',
        onClick: this.requestMoveField,
      });
      options.push({
        text: 'Delete this Field',
        onClick: this.requestDeleteField,
      });
    }
    if (!field.isNamedField())
    {
      options.push({
        text: 'Extract this array element',
        onClick: this.requestExtractIndex,
      });
    }
    if (field.isPrimitive() && !field.isLocalToRoot())
    {
      options.push({
        text: 'Make array of these values',
        onClick: this.requestExtractSimple,
      });
    }
    return List(options);
  }

  public isPrimaryKey()
  {
    const language = this._getCurrentLanguage();
    return LanguageController.get(language).isFieldPrimaryKey(this._currentEngine(), this.props.fieldId);
  }

  @instanceFnDecorator(memoizeOne)
  public getLabelStyle(settingsOpen: boolean, canEdit: boolean, isWildcard: boolean)
  {
    let labelStyle = {};
    if (isWildcard)
    {
      labelStyle = settingsOpen ?
        fontColor(Colors().active, Colors().active)
        :
        fontColor(Colors().text3, Colors().text3);
    }
    else
    {
      labelStyle = settingsOpen ?
        fontColor(Colors().active, Colors().active)
        :
        fontColor(Colors().text2, Colors().text1);
    }
    if (!canEdit)
    {
      labelStyle = _.extend({}, labelStyle, {
        opacity: 0.5,
      });
    }
    return labelStyle;
  }

  public renderPreviewValue()
  {
    const { preview, labelOnly } = this.props;
    const field = this._field();

    const hidePreviewValue =
      field.etlType === ETLFieldTypes.Array ||
      field.etlType === ETLFieldTypes.Object ||
      labelOnly;

    if (hidePreviewValue)
    {
      return null;
    }
    else
    {
      let previewText: string;
      switch (field.etlType)
      {
        case ETLFieldTypes.GeoPoint:
          if (preview == null)
          {
            previewText = 'N/A';
          }
          else if (typeof preview !== 'object')
          {
            previewText = 'INVALID GEOPOINT';
          }
          else
          {
            previewText = `Lat: ${preview.lat}, Lon: ${preview.lon}`;
          }
          break;
        default:
          previewText = preview == null ? 'N/A' : preview.toString();
          if (previewText.length >= MAX_STRING_LENGTH)
          {
            previewText = previewText.slice(0, MAX_STRING_LENGTH) + '...';
          }
          break;
      }

      return (
        <div
          className={classNames({
            'field-preview-value': true,
          })}
          style={fontColor(Colors().text2)}
        >
          {previewText}
        </div>
      );
    }
  }

  public renderMenu()
  {
    if (this.props.labelOnly)
    {
      return null;
    }
    else
    {
      const menuOptions = this.menuOptions(this._field());
      const showMenu = menuOptions.size > 0 && (this.state.hovered || this.state.menuOpen);
      return (
        <div
          className={classNames({
            'field-preview-menu': true,
            'field-preview-menu-hidden': !showMenu,
          })}
        >
          <Menu
            options={menuOptions}
            small={true}
            openRight={true}
            onChangeState={this.handleMenuStateChange}
            overrideMultiplier={7}
          />
        </div>
      );
    }
  }

  public render()
  {
    const { canEdit, labelOverride } = this.props;
    const field = this._field();
    const settingsOpen = this._settingsAreOpen();

    const labelStyle = this.getLabelStyle(settingsOpen, canEdit && this._field().isIncluded, field.isWildcardField());

    return (
      <div className='template-editor-field-block'>
        <div className='field-preview-row'>
          <div
            className='field-preview-label-group'
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
          >
            {
              this.renderTypeIcon()
            }
            <div
              className={classNames({
                'field-preview-label': true,
                'field-preview-array-label': field.isWildcardField(),
                'field-preview-can-toggle': this.props.toggleOpen !== undefined,
              })}
              onClick={this.handleLabelClicked}
              style={labelStyle}
              key='label'
            >
              {labelOverride != null ? labelOverride : field.name}
            </div>
            {
              this.isPrimaryKey() ?
                <div
                  className='primary-key-icon'
                  style={fontColor(Colors().active)}
                >
                  <KeyIcon />
                </div>
                :
                null
            }
            {
              this.renderMenu()
            }
          </div>
          {
            this.renderPreviewValue()
          }
        </div>
      </div>
    );
  }

  public handleMouseEnter()
  {
    this.setState({
      hovered: true,
    });
  }

  public handleMouseLeave()
  {
    this.setState({
      hovered: false,
    });
  }

  public handleMenuStateChange(menuOpen)
  {
    this.setState({
      menuOpen,
      hovered: menuOpen ? this.state.hovered : false,
    });
  }

  public requestMoveField()
  {
    this.props.act({
      actionType: 'setDisplayState',
      state: {
        moveFieldId: this.props.fieldId,
      },
    });
  }

  public deleteThisField()
  {
    this._try((proxy) =>
    {
      proxy.deleteField(this.props.fieldId);
    });
  }

  public requestDeleteField()
  {
    let message = 'Are you sure you want to delete this field?';
    if (this._field().childrenIds.size > 0)
    {
      message = 'Deleting this field will remove all child fields. ' + message;
    }
    this.props.act({
      actionType: 'addModal',
      props: {
        title: 'Confirm Action',
        message,
        confirm: true,
        onConfirm: this.deleteThisField.bind(this),
      },
    });
  }

  public requestAddField()
  {
    this.props.act({
      actionType: 'setDisplayState',
      state: {
        addFieldId: this.props.fieldId,
      },
    });
  }

  public requestExtractIndex()
  {
    this.props.act({
      actionType: 'setDisplayState',
      state: {
        extractField: {
          fieldId: this.props.fieldId,
          index: this._getArrayIndex(),
          isIndexExtract: true,
        },
      },
    });
  }

  public requestExtractSimple()
  {
    this.props.act({
      actionType: 'setDisplayState',
      state: {
        extractField: {
          fieldId: this.props.fieldId,
          index: null,
          isIndexExtract: false,
        },
      },
    });
  }

  public openSettings()
  {
    this.props.act({
      actionType: 'openSettings',
      fieldId: this.props.fieldId,
      dkp: this.props.displayKeyPath,
    });
  }

  public handleLabelClicked()
  {
    if (this._settingsAreOpen())
    {
      this.props.act({
        actionType: 'closeSettings',
      });
    }
    else
    {
      this.openSettings();
    }
  }

  private renderTypeIcon()
  {
    const type = EngineUtil.getETLFieldType(this.props.fieldId, this._currentEngine());
    const Icon = typeToIcon[type];
    return (
      <div
        className='field-type-icon'
        style={fontColor(Colors().text2)}
      >
        <Icon />
      </div>
    );
  }
}

const TextTypeIcon = require('./../../../../../images/icon_type_text.svg?name=TextTypeIcon');
const DateTypeIcon = require('./../../../../../images/icon_type_date.svg?name=DateTypeIcon');
const NumberTypeIcon = require('./../../../../../images/icon_type_number.svg?name=NumberTypeIcon');
const ArrayTypeIcon = require('./../../../../../images/icon_type_array.svg?name=ArrayTypeIcon');
const ObjectTypeIcon = require('./../../../../../images/icon_type_object.svg?name=ObjectTypeIcon');
const GeoTypeIcon = require('./../../../../../images/icon_type_geo.svg?name=GeoTypeIcon');
const BooleanTypeIcon = require('./../../../../../images/icon_type_boolean.svg?name=BooleanTypeIcon');

const typeToIcon: {
  [k in ETLFieldTypes]: any;
} = {
    [ETLFieldTypes.String]: TextTypeIcon,
    [ETLFieldTypes.Object]: ObjectTypeIcon,
    [ETLFieldTypes.Number]: NumberTypeIcon,
    [ETLFieldTypes.Integer]: NumberTypeIcon,
    [ETLFieldTypes.Boolean]: BooleanTypeIcon,
    [ETLFieldTypes.Array]: ArrayTypeIcon,
    [ETLFieldTypes.Date]: DateTypeIcon,
    [ETLFieldTypes.GeoPoint]: GeoTypeIcon,
  };

const emptyOptions = List([]);

export default Util.createTypedContainer(
  EditorFieldPreview,
  mapStateKeys,
  mapDispatchKeys,
);
