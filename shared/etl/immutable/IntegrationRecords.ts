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
// tslint:disable:max-classes-per-file strict-boolean-expressions import-spacing

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'shared/util/Classes';
import { FileConfig } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';

import
{
  AuthConfigType,
  ConnectionConfigType,
  IntegrationConfigBase,
  Integrations,
} from 'shared/etl/types/IntegrationTypes';

class IntegrationConfigC implements IntegrationConfigBase
{
  public id = -1;
  public name = '';
  public type = null;
  public authConfig: AuthConfigType<Integrations> | {} = {};
  public connectionConfig: ConnectionConfigType<Integrations> | {} = {};
  public createdBy = -1;
  public lastModified: Date = null;
  public readPermission = null;
  public writePermission = null;
  public meta = null;

  public guessFileOptions(): Partial<FileConfig>
  {
    const config = this.connectionConfig;
    switch (this.type)
    {
      case Integrations.Http:
        return guessFileOptionsHelper(config.url);
      case Integrations.Fs:
        return guessFileOptionsHelper(config.path);
      case Integrations.Magento:
      case Integrations.Postgresql:
      case Integrations.GoogleAnalytics:
      case Integrations.Mysql:
        return {
          fileType: FileTypes.Json,
        };
      case Integrations.Mailchimp:
        return {
          fileType: FileTypes.Csv,
        };
      default:
        return null;
    }
  }
}
export type IntegrationConfig = WithIRecord<IntegrationConfigC>;
export const _IntegrationConfig = makeExtendedConstructor(IntegrationConfigC, true, {
  lastModified: (date) =>
  {
    return typeof date === 'string' ? new Date(date) : date;
  },
});

function guessFileOptionsHelper(path: string): Partial<FileConfig>
{
  if (typeof path !== 'string')
  {
    return null;
  }
  const parts = path.split('.');
  if (parts.length !== 0)
  {
    const extension = parts[parts.length - 1];
    const fileType = extensionToFileType[extension];
    if (fileType === undefined)
    {
      return null;
    }
    else
    {
      return {
        fileType,
      };
    }
  }
  else
  {
    return null;
  }
}

const extensionToFileType: {
  [k: string]: FileTypes,
} = {
  json: FileTypes.Json,
  csv: FileTypes.Csv,
  tsv: FileTypes.Tsv,
  xlsx: FileTypes.Xlsx,
  xml: FileTypes.Xml,
};
