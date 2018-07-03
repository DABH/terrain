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

import { Readable, Writable } from 'stream';

import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import { SinkConfig, SourceConfig } from '../../../../../shared/etl/types/EndpointTypes';
import { TransformationEngine } from '../../../../../shared/transformations/TransformationEngine';
import AEndpointStream from './AEndpointStream';

import ExportTransform from '../ExportTransform';

import DatabaseController from '../../../database/DatabaseController';
import DatabaseRegistry from '../../../databaseRegistry/DatabaseRegistry';
import * as Util from '../../AppUtil';
import { QueryHandler } from '../../query/QueryHandler';

export class AlgorithmEndpoint extends AEndpointStream
{
  constructor()
  {
    super();
  }

  public async getExportTransform(source: SourceConfig): Promise<ExportTransform>
  {
    const algorithmId: number = source.options['algorithmId'];
    let query: string = source.options['query'];

    if (algorithmId !== undefined)
    {
      query = await Util.getQueryFromAlgorithm(algorithmId);
      const scoreNormalization = Util.computeMaximumAlgorithmScore(query);
      return new ExportTransform({
        scoreNormalization,
      });
    }
    return new ExportTransform();
  }

  public async getSource(source: SourceConfig): Promise<Readable>
  {
    const algorithmId: number = source.options['algorithmId'];
    let dbId: number = source.options['dbId'];
    let query: string = source.options['query'];

    if (algorithmId !== undefined)
    {
      query = await Util.getQueryFromAlgorithm(algorithmId);
      dbId = await Util.getDBFromAlgorithm(algorithmId);
    }

    if (source.options['size'] !== undefined)
    {
      const parser = new ESJSONParser(query, true);
      if (parser.hasError())
      {
        throw parser.getErrors();
      }

      const queryObj = parser.getValue();
      queryObj['size'] = source.options['size'];
      query = JSON.stringify(queryObj);
    }

    const controller: DatabaseController | undefined = DatabaseRegistry.get(dbId);
    if (controller === undefined)
    {
      throw new Error(`Database ${String(dbId)} not found.`);
    }

    if (controller.getType() !== 'ElasticController')
    {
      throw new Error('Query endpoint only supports Elastic databases');
    }

    const qh: QueryHandler = controller.getQueryHandler();
    const payload = {
      database: dbId,
      type: 'search',
      streaming: true,
      body: query,
    };

    return qh.handleQuery(payload) as Promise<Readable>;
  }

  public async getSink(sink: SinkConfig, engine?: TransformationEngine): Promise<Writable>
  {
    throw new Error('Algorithm sink endpoint not implemented');
  }
}

export default AlgorithmEndpoint;
