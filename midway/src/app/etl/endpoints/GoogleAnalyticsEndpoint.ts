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

import * as googleoauthjwt from 'google-oauth-jwt';
import * as _ from 'lodash';
import { Readable, Writable } from 'stream';

import { SinkConfig, SourceConfig } from 'shared/etl/types/EndpointTypes';
import { MidwayLogger } from '../../log/MidwayLogger';

import { TransformationEngine } from '../../../../../shared/transformations/TransformationEngine';
import JSONTransform from '../../io/streams/JSONTransform';
import AEndpointStream from './AEndpointStream';

const request = googleoauthjwt.requestWithJWT();

export interface GoogleAnalyticsConfig
{
  dateRanges: GoogleAnalyticsDateRangeConfig[];
  dimensions: GoogleAnalyticsDimensionConfig[];
  email: string;
  metrics: GoogleAnalyticsMetricConfig[];
  pageToken?: string;
  pageSize?: number;
  scopes: string[];
  viewId: number;
}

interface GoogleAnalyticsDateRangeConfig
{
  endDate: string;
  startDate: string;
}

interface GoogleAnalyticsDimensionConfig
{
  name: string;
}

interface GoogleAnalyticsMetricConfig
{
  alias: string;
  expression: string;
}

interface GoogleAnalyticsResponseConfig
{
  reports: GoogleAnalyticsResponseReportConfig[];
}

interface GoogleAnalyticsResponseReportConfig
{
  columnHeader: GoogleAnalyticsResponseReportColumnHeaderConfig;
  data: GoogleAnalyticsResponseReportDataConfig;
  nextPageToken?: string;
}

interface GoogleAnalyticsResponseReportColumnHeaderConfig
{
  metricHeader: object;
}

interface GoogleAnalyticsResponseReportDataConfig
{
  dimensions: string[];
  metrics: object[];
  rowCount: number;
  rows: object[];
}

export default class GoogleAnalyticsEndpoint extends AEndpointStream
{
  constructor()
  {
    super();
  }

  public async getSource(source: SourceConfig): Promise<Readable>
  {
    const config = await this.getIntegrationConfig(source.integrationId);
    const url = 'https://analyticsreporting.googleapis.com/v4/reports:batchGet';
    return this.getRequestStream(config, source, url) as Promise<Readable>;
  }

  public async getSink(sink: SinkConfig, engine?: TransformationEngine): Promise<Writable>
  {
    throw new Error('not implemented');
  }

  private async getRequestStream(gaConfig: object, gaSource: SourceConfig, url: string): Promise<Readable | Writable>
  {
    return new Promise<Readable | Writable>((resolve, reject) =>
    {
      const dayInterval: number = gaSource.options['dayInterval'];
      if (dayInterval === undefined || typeof dayInterval !== 'number')
      {
        MidwayLogger.warn('Day interval must be specified in numerical format');
      }
      const currDate: any = new Date(Date.now() - 1000 * 3600 * 24);

      const padDate = (str: string): string =>
      {
        const fullLength: number = 2;
        if (str.length < fullLength)
        {
          for (let i = 0; i < fullLength - str.length; ++i)
          {
            str = '0' + str;
          }
        }
        return str;
      };
      const startDate: any = new Date(currDate - 1000 * 3600 * 24 * dayInterval);
      const currDateStr = (currDate.getFullYear().toString() as string) + '-'
        + (padDate((currDate.getMonth() as number + 1).toString()) as string) + '-'
        + (padDate(currDate.getDate().toString()) as string);
      const startDateStr = (startDate.getFullYear().toString() as string) + '-'
        + (padDate((startDate.getMonth() as number + 1).toString()) as string) + '-'
        + (padDate(startDate.getDate().toString()) as string);
      const dateRange: object[] = [{ startDate: startDateStr, endDate: currDateStr }];

      const analyticsBody: object =
      {
        reportRequests: [
          {
            dateRanges: dateRange,
            dimensions: gaConfig['dimensions'],
            metrics: gaConfig['metrics'],
            viewId: gaConfig['viewId'].toString(),
          },
        ],
      };

      let colNames: string[] = [];
      let constructedHeader: boolean = false;
      let potentialError: string = '';
      const zippedRows: object[] = [];
      const writeStream = JSONTransform.createExportStream();
      const scopeURL: string = 'https://www.googleapis.com/auth/';
      const scopes: string[] = [];
      let gaConfigPrivateKey: string = '-----BEGIN RSA PRIVATE KEY-----' + ((gaConfig['privateKey'] as string)
        .replace('-----BEGIN RSA PRIVATE KEY-----', '').replace('-----END RSA PRIVATE KEY-----', '')
        .replace(new RegExp('\\s', 'g'), '\n').replace(new RegExp('\\n+', 'g'), '\n') as string) + '-----END RSA PRIVATE KEY-----';
      if (gaConfig['privateKey'].indexOf('BEGIN PRIVATE KEY') !== -1 && gaConfig['privateKey'].indexOf('END PRIVATE KEY') !== -1)
      {
        gaConfigPrivateKey = '-----BEGIN PRIVATE KEY-----' + ((gaConfig['privateKey'] as string)
          .replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '')
          .replace(new RegExp('\\s', 'g'), '\n').replace(new RegExp('\\n+', 'g'), '\n') as string) + '-----END PRIVATE KEY-----';
      }

      gaConfig['scopes'].forEach((gaConfigScope) =>
      {
        switch (gaConfigScope)
        {
          case 'edit':
            scopes.push(scopeURL + 'analytics');
            break;
          default:
            scopes.push(scopeURL + 'analytics.readonly');
        }
      });

      const analyticsBatchGet = (analyticsBodyPassed) =>
      {
        MidwayLogger.info(gaConfig['email']);
        MidwayLogger.info('<redacted private key contents>');
        request(
          {
            method: gaConfig['method'] != null ? gaConfig['method'] : 'POST',
            url,
            jwt:
            {
              email: gaConfig['email'],
              key: gaConfigPrivateKey,
              scopes,
            },
            json: true,
            body: analyticsBody,
          }, (err, res, body) =>
          {
            if (err !== null && err !== undefined)
            {
              MidwayLogger.warn(gaConfig['email']);
              MidwayLogger.warn(gaConfigPrivateKey);
              MidwayLogger.warn('<redacted private key contents>');
              MidwayLogger.warn(err);
            }
            try
            {
              potentialError = JSON.stringify(body, null, 2);
              const report: GoogleAnalyticsResponseReportConfig = (body as GoogleAnalyticsResponseConfig).reports[0];
              if (constructedHeader === false)
              {
                colNames = colNames.concat(report.columnHeader['dimensions']);
                report.columnHeader.metricHeader['metricHeaderEntries'].forEach((entity) =>
                {
                  colNames.push(entity['name']);
                });
                resolve(writeStream);
              }

              // writeStream.write(colNames);
              const rows: object[] = report.data.rows;

              if (Array.isArray(rows))
              {
                rows.forEach((row) =>
                {
                  writeStream.write(_.zipObject(colNames, [].concat(row['dimensions'], row['metrics'][0]['values'])));
                });
              }
              constructedHeader = true;
              if (report['nextPageToken'] !== undefined)
              {
                MidwayLogger.info('Fetching the next page of reports... pageToken ' + report.nextPageToken);
                analyticsBodyPassed['reportRequests'][0]['pageToken'] = report.nextPageToken;
                analyticsBatchGet(analyticsBodyPassed);
              }
              else // finish
              {
                writeStream.end();
              }
            }
            catch (e)
            {
              MidwayLogger.warn(potentialError);
              MidwayLogger.info('Potentially incorrect credentials. Caught error: ' + (e.toString() as string));
              throw new Error('Potentially incorrect Google API credentials.');
            }
          });
      };
      analyticsBatchGet(analyticsBody);
    });
  }
}
