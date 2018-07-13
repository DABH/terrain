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

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import LogStreamWritable from '../io/streams/LogStreamWritable';

import JobLogConfig from './JobLogConfig';

export class JobLog
{
  private jobLogTable: Tasty.Table;

  public initialize()
  {
    this.jobLogTable = App.TBLS.jobLogs;
  }

  /*
   * PARAMS: jobId, logStream (number, stream.Readable ==> number)
   *
   */
  public async create(jobId: number, logStream: LogStreamWritable, jobStatus?: boolean, runNow?: boolean): Promise<JobLogConfig[]>
  {
    return new Promise<JobLogConfig[]>(async (resolve, reject) =>
    {
      const jobLogs: JobLogConfig[] = await this.get(jobId);
      if (jobLogs.length !== 0)
      {
        throw new Error('Job log already exists');
      }

      const newJobLog: JobLogConfig =
        {
          contents: '',
          createdAt: new Date(),
          id: jobId,
        };

      const upsertedJobLogs: JobLogConfig[] = await App.DB.upsert(this.jobLogTable, newJobLog) as JobLogConfig[];
      resolve(upsertedJobLogs);
      const updatedContentJobLog: JobLogConfig = upsertedJobLogs[0];
      let jobStatusMsg: string = 'SUCCESS';
      try
      {
        const accumulatedLog: string[] = await this._consumeLogStreamWritable(logStream);
        updatedContentJobLog.contents = accumulatedLog.join('\n');
        if (jobStatus === false)
        {
          jobStatusMsg = 'FAILURE';
        }
        await App.JobQ.setJobStatus(jobId, false, jobStatusMsg, jobId);
        await App.DB.upsert(this.jobLogTable, updatedContentJobLog);
      }
      catch (e)
      {
        if (Array.isArray(e['logs']))
        {
          updatedContentJobLog.contents = e['logs'].join('\n');
        }
        else
        {
          updatedContentJobLog.contents = e.toString();
        }
        await App.DB.upsert(this.jobLogTable, updatedContentJobLog);
        jobStatusMsg = 'FAILURE';
        await App.JobQ.setJobStatus(jobId, false, jobStatusMsg);
      }

      await App.JobQ.setScheduleStatus(jobId, false);
      App.JobQ.deleteRunningJob(jobId, runNow);
    });
  }

  public async get(id?: number): Promise<JobLogConfig[]>
  {
    return this._select([], { id });
  }

  private async _consumeLogStreamWritable(logStream: LogStreamWritable): Promise<string[]>
  {
    return new Promise<string[]>(async (resolve, reject) =>
    {
      const result: string[] = [];
      logStream.on('error', (e) =>
      {
        return reject(e);
      });

      if (logStream.getState() === true)
      {
        const chunks: any[] = logStream.getBuffers();
        chunks.forEach((chunk) =>
        {
          let stringifiedChunk: string = '';
          try
          {
            stringifiedChunk = chunk.toString();
          }
          catch (e)
          {
            // do nothing
          }
          result.push(stringifiedChunk);
        });
        return resolve(result);
      }
      else
      {
        logStream.on('finish', () =>
        {
          const chunks: any[] = logStream.getBuffers();
          chunks.forEach((chunk) =>
          {
            let stringifiedChunk: string = '';
            try
            {
              stringifiedChunk = chunk.toString();
            }
            catch (e)
            {
              // do nothing
            }
            result.push(stringifiedChunk);
          });
          return resolve(result);
        });
      }
    });
  }

  private async _select(columns: string[], filter: object): Promise<JobLogConfig[]>
  {
    return App.DB.select(this.jobLogTable, columns, filter) as Promise<JobLogConfig[]>;
  }
}

export default JobLog;
