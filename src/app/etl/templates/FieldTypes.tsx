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
// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable import-spacing
import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { ELASTIC_TYPES } from 'shared/etl/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { makeConstructor, makeDeepConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

class ElasticFieldSettingsC
{
  public langType: string = 'elastic';
  public isAnalyzed: boolean = true;
  public analyzer: string = '';
  public type: ELASTIC_TYPES = ELASTIC_TYPES.TEXT;
  public arrayType: List<ELASTIC_TYPES> = List([ELASTIC_TYPES.TEXT]);
}
export type ElasticFieldSettings = WithIRecord<ElasticFieldSettingsC>;
export const _ElasticFieldSettings = makeDeepConstructor(ElasticFieldSettingsC, {
  arrayType: List,
});

class TemplateFieldC
{
  public isIncluded: boolean = true;
  public langSettings: ElasticFieldSettings = _ElasticFieldSettings();
  public fieldId: number = 0;
  public name: string = '';
  public children: List<TemplateField> = List([]);
}
export type TemplateField = WithIRecord<TemplateFieldC>;
export const _TemplateField = makeDeepConstructor(TemplateFieldC, {
  children: (config: object[] = []) =>
  {
    return List<TemplateField>(config.map((value: object, index) => _TemplateField(value, true)));
  },
  langSettings: _ElasticFieldSettings,
});

const doNothing = () => null;
// has methods that abstract how the tree is mutated
// can also be constructed to create a 'tree' that emulates a store
export class FieldTreeProxy
{
  private onMutate: (root: TemplateField) => void = doNothing;

  constructor(private root: TemplateField, onMutate?: (f: TemplateField) => void)
  {
    if (onMutate !== undefined)
    {
      this.onMutate = onMutate;
    }
  }

  public createField(pathToField: KeyPath, field: TemplateField): FieldNodeProxy
  {
    const creatingField = this.root.getIn(pathToField);
    const nextIndex = creatingField.children.size;
    const pathToChildField = pathToField.push('children', nextIndex);
    this.root = this.root.setIn(pathToChildField, field);
    this.onMutate(this.root);
    return new FieldNodeProxy(this, pathToChildField);
  }

  public updateField(pathToField: KeyPath, key: string | number, value: any)
  {
    const keyPath = pathToField.push(key);
    this.root = this.root.setIn(keyPath, value);
    this.onMutate(this.root);
  }

  public deleteField(pathToField: KeyPath)
  {
    this.root = this.root.deleteIn(pathToField);
    this.onMutate(this.root);
  }

  public getRootField(): TemplateField
  {
    return this.root;
  }

  public getField(path: KeyPath): TemplateField
  {
    return this.root.getIn(path);
  }

  public getRootNode(): FieldNodeProxy
  {
    return new FieldNodeProxy(this, List([]));
  }
}

export class FieldNodeProxy
{
  constructor(private tree: FieldTreeProxy, private path: KeyPath)
  {

  }

  public exists()
  {
    return this.tree.getRootField().hasIn(this.path);
  }

  public field(): TemplateField
  {
    return this.tree.getField(this.path);
  }

  public makeChild(field: TemplateField): FieldNodeProxy
  {
    return this.tree.createField(this.path, field);
  }

  public set<K extends keyof TemplateField>(key: K, value: TemplateField[K]): FieldNodeProxy
  {
    this.tree.updateField(this.path, key, value);
    return this;
  }

  public get<K extends keyof TemplateField>(key: K): TemplateField[K]
  {
    return this.field().get(key);
  }

  public deleteSelf()
  {
    this.tree.deleteField(this.path);
  }

  public clearChildren()
  {
    this.tree.updateField(this.path, 'children', List([]));
  }
}

export abstract class FieldUtil
{
  public static isArray(field): boolean
  {
    const type = field.langSettings.type;
    return type === ELASTIC_TYPES.ARRAY;
  }

  // returns how deep the array type is. For example, if the field's type is array of array of text, then the depth is 2.
  public static arrayDepth(field): number
  {
    const { arrayType } = field.langSettings;
    return FieldUtil.isArray(field) ? arrayType.size : 0;
  }

  public static isNested(field): boolean
  {
    const { type, arrayType } = field.langSettings;
    return type === ELASTIC_TYPES.NESTED ||
      (type === ELASTIC_TYPES.ARRAY && arrayType.size > 0 && arrayType.last() === ELASTIC_TYPES.NESTED);
  }

  public static isRoot(keyPath: KeyPath): boolean
  {
    return keyPath.size === 0;
  }
}
