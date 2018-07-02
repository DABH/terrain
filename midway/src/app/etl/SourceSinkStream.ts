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
import * as _ from 'lodash';
import * as stream from 'stream';

import { ElasticMapping } from 'shared/etl/mapping/ElasticMapping';
import
{
  DefaultSinkConfig,
  DefaultSourceConfig,
  SinkConfig,
  SourceConfig,
} from 'shared/etl/types/EndpointTypes';
import { ElasticTypes } from 'shared/etl/types/ETLElasticTypes';
import { PostProcessConfig } from 'shared/etl/types/PostProcessTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import * as Util from '../AppUtil';
import { MidwayLogger } from '../log/MidwayLogger';
import ExportTransform from './ExportTransform';
import { PostProcess } from './PostProcess';
import { TemplateConfig } from './TemplateConfig';
import Templates from './Templates';

import CSVTransform from '../io/streams/CSVTransform';
import JSONTransform from '../io/streams/JSONTransform';
import ProgressStream from '../io/streams/ProgressStream';
import XLSXTransform from '../io/streams/XLSXTransform';
import XMLTransform from '../io/streams/XMLTransform';

import AEndpointStream from './endpoints/AEndpointStream';
import AlgorithmEndpoint from './endpoints/AlgorithmEndpoint';
import ElasticEndpoint from './endpoints/ElasticEndpoint';
import FollowUpBossEndpoint from './endpoints/FollowUpBossEndpoint';
import FSEndpoint from './endpoints/FSEndpoint';
import GoogleAnalyticsEndpoint from './endpoints/GoogleAnalyticsEndpoint';
import HTTPEndpoint from './endpoints/HTTPEndpoint';
import MailChimpEndpoint from './endpoints/MailChimpEndpoint';
import MySQLEndpoint from './endpoints/MySQLEndpoint';
import PostgreSQLEndpoint from './endpoints/PostgreSQLEndpoint';
import SFTPEndpoint from './endpoints/SFTPEndpoint';

export const postProcessTransform: PostProcess = new PostProcess();

export async function getSourceStream(name: string, source: SourceConfig, files?: stream.Readable[]): Promise<stream.Readable>
{
  return new Promise<stream.Readable>(async (resolve, reject) =>
  {
    let sourceStream: stream.Readable | undefined;
    let sourceStreams: stream.Readable[] | undefined;
    let endpoint: AEndpointStream;
    let importStream: stream.Readable;
    const importStreams: stream.Readable[] = [];

    MidwayLogger.info(`Processing ${source.type} source:`, JSON.stringify(source, null, 2));

    try
    {
      switch (source.type)
      {
        case 'Algorithm':
          endpoint = new AlgorithmEndpoint();
          const algorithmStream = await endpoint.getSource(source) as stream.Readable;
          sourceStream = algorithmStream.pipe(new ExportTransform());
          return resolve(sourceStream);
        case 'Upload':
          if (files === undefined || files.length === 0)
          {
            throw new Error('No file(s) found in multipart formdata');
          }
          sourceStream = files.find((f) => f['fieldname'] === name);
          break;
        case 'Sftp':
          endpoint = new SFTPEndpoint();
          const sourceStreamTmp: stream.Readable | stream.Readable[] = await endpoint.getSource(source);
          if (Array.isArray(sourceStreamTmp))
          {
            sourceStreams = sourceStreamTmp as stream.Readable[];
          }
          else
          {
            sourceStream = sourceStreamTmp as stream.Readable;
          }
          break;
        case 'GoogleAnalytics':
          endpoint = new GoogleAnalyticsEndpoint();
          sourceStream = await endpoint.getSource(source) as stream.Readable;
          break;
        case 'Http':
          endpoint = new HTTPEndpoint();
          sourceStream = await endpoint.getSource(source) as stream.Readable;
          break;
        case 'Fs':
          endpoint = new FSEndpoint();
          sourceStream = await endpoint.getSource(source) as stream.Readable;
          break;
        case 'Mysql':
          endpoint = new MySQLEndpoint();
          sourceStream = await endpoint.getSource(source) as stream.Readable;
          return resolve(sourceStream);
        case 'Postgresql':
          endpoint = new PostgreSQLEndpoint();
          sourceStream = await endpoint.getSource(source) as stream.Readable;
          return resolve(sourceStream);
        default:
          throw new Error('Source type not implemented.');
      }

      if (sourceStream === undefined && sourceStreams === undefined)
      {
        throw new Error('Error finding source stream(s) ' + name);
      }

      if (sourceStream !== undefined && sourceStreams === undefined)
      {
        sourceStreams = [sourceStream] as stream.Readable[];
      }

      sourceStreams.forEach(async (ss: stream.Readable) =>
      {
        switch (source.fileConfig.fileType)
        {
          case 'json':
            let jsonPath: string = (source.fileConfig.jsonNewlines) ? undefined : '*';
            if (!!source.fileConfig.jsonPath)
            {
              jsonPath = source.fileConfig.jsonPath;
            }
            importStreams.push(ss.pipe(JSONTransform.createImportStream(jsonPath)));
            break;
          case 'csv':
            importStreams.push(ss.pipe(CSVTransform.createImportStream()));
            break;
          case 'tsv':
            importStreams.push(ss.pipe(CSVTransform.createImportStream(true, '\t')));
            break;
          case 'xlsx':
            importStreams.push(ss.pipe(XLSXTransform.createImportStream()));
            break;
          case 'xml':
            const xmlPath: string | undefined = source.fileConfig.xmlPath;
            importStreams.push(sourceStream.pipe(XMLTransform.createImportStream(xmlPath)));
            break;
          default:
            throw new Error('Download file type must be either CSV, TSV, JSON, XLSX or XML.');
        }
      });

      if (sourceStream !== undefined || importStreams.length === 1)
      {
        importStream = importStreams[0];
      }

      // ETL transformation engine currently only takes a single source stream, so we have to do postprocessing on
      // multiple streams to reduce them down to a single stream, or throw an error if we would be returning multiple streams
      if (Array.isArray(source.options['transformations']) && source.options['transformations'].length !== 0)
      {
        const writeStream = new stream.Readable({ objectMode: true });
        const postProcessedRows: object[]
          = await postProcessTransform.process(source.options['transformations'] as PostProcessConfig[], importStreams);
        resolve(writeStream);
        postProcessedRows.forEach((pPR) =>
        {
          writeStream.push(pPR);
        });
        writeStream.push(null);
      }
      else if (importStreams.length > 1)
      {
        throw new Error('Too many streams without post process transformations');
      }
      else
      {
        resolve(importStream);
      }
    }
    catch (e)
    {
      return reject(e);
    }
  });
}

export interface SinkStreamConfig
{
  isMerge?: boolean;
}

export async function getSinkStream(
  sink: SinkConfig,
  engine: TransformationEngine,
  options?: SinkStreamConfig,
): Promise<stream.Duplex>
{
  return new Promise<stream.Duplex>(async (resolve, reject) =>
  {
    let endpoint: AEndpointStream;
    let transformStream;

    MidwayLogger.info(`Processing ${sink.type} sink:`, JSON.stringify(sink, null, 2));

    try
    {
      if (sink.type !== 'Database' && sink.type !== 'FollowUpBoss' && sink.type !== 'MailChimp')
      {
        switch (sink.fileConfig.fileType)
        {
          case 'json':
            if (sink.fileConfig.jsonPath !== null && sink.fileConfig.jsonPath !== undefined)
            {
              let path = sink.fileConfig.jsonPath.split('.');
              const wildcardIndex: number = path.indexOf('*');
              if (wildcardIndex >= 0)
              {
                if (wildcardIndex < path.length - 1)
                {
                  MidwayLogger.error('Ignoring invalid JSON path: ', sink.fileConfig.jsonPath);
                  path = [];
                }
                else // wildCardIndex === path.length - 1
                {
                  path.pop();
                }
              }

              let open = '';
              let close = '';
              for (const p of path)
              {
                open += '{\n\t"' + p + '": ';
                close = '\n}' + close;
              }
              open += '[\n';
              close = '\n]' + close;
              transformStream = JSONTransform.createExportStream(open, ',\n', close);
            }
            else if (sink.fileConfig.jsonNewlines)
            {
              transformStream = JSONTransform.createExportStream('', '\n', '');
            }
            else
            {
              transformStream = JSONTransform.createExportStream();
            }
            break;
          case 'csv':
            transformStream = CSVTransform.createExportStream(
              sink.fileConfig.fieldOrdering !== null ? sink.fileConfig.fieldOrdering : sink.fileConfig.hasCsvHeader,
            );
            break;
          case 'tsv':
            transformStream = CSVTransform.createExportStream(
              sink.fileConfig.fieldOrdering !== null ? sink.fileConfig.fieldOrdering : sink.fileConfig.hasCsvHeader,
              '\t',
            );
            break;
          case 'xml':
            const xmlPath: string | undefined = sink.fileConfig.xmlPath;
            const isPlaFeed: boolean = sink.fileConfig.isPlaFeed;
            transformStream = XMLTransform.createExportStream(xmlPath, isPlaFeed);
            break;
          default:
            throw new Error('Export file type must be either CSV, TSV, JSON or XML.');
        }
      }

      switch (sink.type)
      {
        case 'Download':
          return resolve(transformStream);
        case 'Database':
          if (sink.options['language'] !== 'elastic')
          {
            throw new Error('Can only import into Elastic at the moment.');
          }
          endpoint = new ElasticEndpoint(options);
          break;
        case 'Sftp':
          endpoint = new SFTPEndpoint();
          break;
        case 'Http':
          endpoint = new HTTPEndpoint();
          break;
        case 'Fs':
          endpoint = new FSEndpoint();
          break;
        case 'FollowUpBoss':
          endpoint = new FollowUpBossEndpoint();
          break;
        case 'MailChimp':
          endpoint = new MailChimpEndpoint();
          break;
        default:
          throw new Error('Sink type not implemented.');
      }

      const sinkStream = await endpoint.getSink(sink, engine);
      if (transformStream !== undefined)
      {
        transformStream.pipe(sinkStream);
        const progressStream = new ProgressStream(transformStream);
        resolve(progressStream);
      }
      else
      {
        const progressStream = new ProgressStream(sinkStream);
        resolve(progressStream);
      }
    }
    catch (e)
    {
      reject(e);
    }
  });
}

export interface IndexInfo
{
  index: string;
  type: string;
}

export async function getMergeJoinStream(
  serverId: string,
  indices: IndexInfo[],
  options: object,
): Promise<stream.Readable>
{
  const leftJoinKey = options['leftJoinKey'] as string;
  const rightJoinKey = options['rightJoinKey'] as string;

  const query = JSON.stringify({
    size: 2147483647,
    query: {
      bool: {
        filter: [
          {
            term: {
              _index: indices[0]['index'],
            },
          },
          {
            term: {
              _type: indices[0]['type'],
            },
          },
        ],
      },
    },
    mergeJoin: {
      leftJoinKey,
      rightJoinKey,
      [options['outputKey']]: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  _index: indices[1]['index'],
                },
              },
              {
                term: {
                  _type: indices[1]['type'],
                },
              },
            ],
          },
        },
      },
    },
  });

  const source = {
    options: {
      serverId,
      query,
    },
  };

  try
  {
    const endpoint = new ElasticEndpoint();
    const elasticStream = await endpoint.getSource(source as any as SourceConfig);
    const exportTransform = new ExportTransform();
    return elasticStream.pipe(exportTransform);
  }
  catch (e)
  {
    return Promise.reject(e);
  }
}
