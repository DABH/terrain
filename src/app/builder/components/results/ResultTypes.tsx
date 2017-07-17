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

// tslint:disable:max-classes-per-file

import { List, Map } from 'immutable';
import { BaseClass, New } from '../../../Classes';

export const MAX_RESULTS = 200;

class ResultClass extends BaseClass
{
  // all available fields for display
  public fields: IMMap<string, string> = Map<string, string>({});

  public primaryKey: any = '';

  public spotlight: any;

  public rawFields: IMMap<string, string> = Map<string, string>({});
  public transformFields: IMMap<string, string> = Map<string, string>({});
}
export type Result = ResultClass & IRecord<ResultClass>;
export const _Result = (config: object = {}) =>
  New<Result>(new ResultClass(config), config, true); // generates unique IDs

export type Results = List<Result>;

class ResultsStateC extends BaseClass
{
  public results: Results = List([]);
  public fields: List<string> = List([]);
  public count: number = 0;
  public rawResult: string = '';

  public primaryKeyToIndex: IMMap<string, number> = Map<string, number>({});

  public hasError: boolean = false;
  public errorMessage: string = '';
  public hasAllFieldsError: boolean = false;
  public allFieldsErrorMessage: string = '';
  public mainErrorMessage: string = '';
  public subErrorMessage: string = '';
  public errorLine: number = -1;

  public valid: boolean = false; // are these results still valid for the given query?

  public loading: boolean = false; // if we're still loading any fields, besides for the count

  public hasLoadedResults: boolean = false;
  public hasLoadedAllFields: boolean = false;
  public hasLoadedCount: boolean = false;
  public hasLoadedTransform: boolean = false;
}
export type ResultsState = ResultsStateC & IRecord<ResultsStateC>;
export let _ResultsState = (config: object = {}) =>
  New<ResultsState>(new ResultsStateC(config), config);
