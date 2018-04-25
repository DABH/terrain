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

import * as _ from 'lodash';
import * as winston from 'winston';

import { TaskConfig } from 'shared/types/jobs/TaskConfig';
import { TaskOutputConfig } from 'shared/types/jobs/TaskOutputConfig';
import { TaskTreeConfig } from 'shared/types/jobs/TaskTreeConfig';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import { Job } from './Job';
import JobConfig from './JobConfig';
import { Task } from './Task';
import { TaskTree } from './TaskTree';

const INTERVAL: number = 60000;

export class JobQueue
{
  private jobTable: Tasty.Table;
  private maxConcurrentJobs: number;
  private runningJobs: Map<number, Job>;

  constructor()
  {
    this.maxConcurrentJobs = 1;
    this.runningJobs = new Map<number, Job>();
    this.jobTable = new Tasty.Table(
      'jobs',
      ['id'],
      [
        'createdAt',
        'logId',
        'meta',
        'name',
        'pausedFilename',
        'priority',
        'running',
        'runNowPriority',
        'scheduleId',
        'status',
        'tasks',
        'type',
        'workerId',
      ],
    );
  }

  public cancel(id: number): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      try
      {
        // send the cancel signal to the Job
        this.runningJobs.get(id).cancel();

        // delete the Job from the runningJobs map
        this.runningJobs.delete(id);

        // set status to CANCELLED
        await this._setJobStatus(id, false, 'CANCELLED');
        return resolve(await this.get(id) as JobConfig[]);
      }
      catch (e)
      {
        // do nothing, job was not found
      }
      return reject([] as JobConfig[]);
    });
  }

  /*
   * PARAMS: job.tasks (TaskConfig[] ==> string)
   *
   */
  public async create(job: JobConfig, runNow?: boolean): Promise<JobConfig[] | string>
  {
    return new Promise<JobConfig[] | string>(async (resolve, reject) =>
    {
      let tasksAsTaskConfig: TaskConfig[] = [];
      try
      {
        tasksAsTaskConfig = JSON.parse(job.tasks);
      }
      catch (e)
      {
        winston.warn('Error while trying to parse tasks: ' + ((e as any).toString() as string));
      }
      if (!Array.isArray(tasksAsTaskConfig))
      {
        return resolve('Tasks is not an array.');
      }
      if (job.id !== undefined && job.id !== null)
      {
        return resolve('Job ID must not be provided as it is autogenerated');
      }
      // != undefined is a way to include both undefined and null
      const creationDate: Date = new Date();
      job.createdAt = creationDate;
      if (job.id === null)
      {
        delete job.id;
      }
      job.meta = (job.meta !== undefined && job.meta !== null) ? job.meta : '';
      job.name = (job.name !== undefined && job.name !== null) ? job.name : '';
      job.pausedFilename = (job.pausedFilename !== undefined && job.pausedFilename !== null) ? job.pausedFilename : '';
      job.priority = (job.priority !== undefined && job.priority !== null) ? job.priority : 1;
      job.running = (job.running !== undefined && job.running !== null) ? job.running : false;
      job.runNowPriority = (job.runNowPriority !== undefined && job.runNowPriority !== null) ? job.runNowPriority : 1;
      job.scheduleId = (job.scheduleId !== undefined) ? job.scheduleId : null;
      job.status = (job.status !== undefined && job.status !== null && job.status !== '') ? job.status : 'PENDING';
      job.tasks = (job.tasks !== undefined && job.tasks !== null) ? job.tasks : '[]';
      job.type = (job.type !== undefined && job.type !== null) ? job.type : 'default';
      job.workerId = (job.workerId !== undefined && job.workerId !== null) ? job.workerId : 1;

      if (runNow === true)
      {
        job = await this._setRunNow(job);
      }

      const upsertedJobs: JobConfig[] = await App.DB.upsert(this.jobTable, job) as JobConfig[];
      // check table to see if jobs need to be run
      await this._checkJobTable();
      return resolve(upsertedJobs);
    });
  }

  public async delete(id: number): Promise<JobConfig[] | string>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      const jobs: JobConfig[] = await this.get(id);
      if (jobs.length === 0)
      {
        return reject('Job does not exist');
      }
      const doNothing: JobConfig[] = await App.DB.delete(this.jobTable, { id }) as JobConfig[];
      return resolve([jobs[0]] as JobConfig[]);
    });
  }

  public async get(id?: number, running?: boolean): Promise<JobConfig[]>
  {
    return this._select([], { id, running });
  }

  public async getLog(id: number): Promise<object>
  {
    return Promise.resolve({}); // TODO implement this
  }

  public async pause(id: number): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      try
      {
        this.runningJobs.get(id).pause();
        await this._setJobStatus(id, true, 'PAUSED');
        return resolve(await this.get(id) as JobConfig[]);
      }
      catch (e)
      {
        // do nothing, job was not found
      }
      return reject([] as JobConfig[]);
    });
  }

  public async run(id: number): Promise<JobConfig[] | string>
  {
    return new Promise<JobConfig[] | string>(async (resolve, reject) =>
    {
      const getJobs: JobConfig[] = await this.get(id, false) as JobConfig[];
      if (getJobs.length === 0)
      {
        return reject('Job not found.');
      }

      await this._setJobStatus(id, true, 'RUNNING');
      getJobs[0] = await this._setRunNow(getJobs[0]);
      resolve(await App.DB.upsert(this.jobTable, getJobs[0]) as JobConfig[]);
    });
  }

  public async unpause(id: number): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      try
      {
        if (this.runningJobs.has(id))
        {
          // set job status back to RUNNING
          await this._setJobStatus(id, true, 'RUNNING');

          // resolve updated job so that we can continue execution without blocking on the response
          resolve(await this.get(id) as JobConfig[]);

          // run job as normal
          const jobResult: TaskOutputConfig = await this.runningJobs.get(id).run() as TaskOutputConfig;
          const jobsFromId: JobConfig[] = await this.get(id);
          const jobStatus: string = jobResult.status === true ? 'SUCCESS' : 'FAILURE';
          await this._setJobStatus(id, false, jobStatus);
          await App.SKDR.setRunning(jobsFromId[0].scheduleId, false);
          this.runningJobs.delete(id);
        }
      }
      catch (e)
      {
        // do nothing, job was not found
      }
      return reject('Job not found.');
    });

  }

  public async initializeJobQueue(): Promise<void>
  {
    // set all jobs that are currently running to ABORTED
    await this._resetAllRunningJobs();

    setTimeout(this._jobLoop.bind(this), INTERVAL - new Date().getTime() % INTERVAL);
  }

  private async _checkJobTable(): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      const jobIdLst: number[] = [];
      const numRunningJobs: number = this.runningJobs.size;
      const newJobSlots: number = this.maxConcurrentJobs - numRunningJobs;
      if (newJobSlots <= 0) // there are no slots for new jobs
      {
        return resolve();
      }
      const query = new Tasty.Query(this.jobTable).filter(this.jobTable['status'].equals('PENDING'))
        .filter(this.jobTable['running'].equals('false')).sort(this.jobTable['priority'], 'asc')
        .sort(this.jobTable['runNowPriority'], 'desc').sort(this.jobTable['createdAt'], 'asc').take(newJobSlots);
      const queryStr: string = App.DB.getDB().generateString(query);
      const rawResults = await App.DB.getDB().execute([queryStr]);
      const jobs: JobConfig[] = rawResults.map((result: object) => new JobConfig(result));

      let i = 0;
      while (i < newJobSlots)
      {
        // number of new jobs that can be added
        const nextJob: JobConfig = jobs.shift();
        if (nextJob === undefined) // there is no next available job
        {
          break;
        }
        if (!this.runningJobs.has(nextJob.id))
        {
          const newJob: Job = new Job();
          let newJobTasks: TaskConfig[] = [];
          try
          {
            newJobTasks = JSON.parse(nextJob.tasks);
          }
          catch (e)
          {
            winston.warn(((e as any).toString() as string));
          }

          const jobCreationStatus: boolean | string = newJob.create(newJobTasks, 'some random filename');
          winston.info('created job');
          if (typeof jobCreationStatus === 'string' || (jobCreationStatus as boolean) !== true)
          {
            winston.warn('Error while creating job: ' + (jobCreationStatus as string));
          }
          // update the table to running = true

          this.runningJobs.set(nextJob.id, newJob);
          const status: boolean = await this._setJobStatus(nextJob.id, true, 'RUNNING');
          if (!status)
          {
            winston.warn('Job running status was not toggled.');
          }
          jobIdLst.push(nextJob.id);
          ++i;
        }
      }

      resolve();
      jobIdLst.forEach(async (jobId) =>
      {
        const jobResult: TaskOutputConfig = await this.runningJobs.get(jobId).run() as TaskOutputConfig;
        const jobsFromId: JobConfig[] = await this.get(jobId);
        const jobStatus: string = jobResult.status === true ? 'SUCCESS' : 'FAILURE';
        await this._setJobStatus(jobsFromId[0].id, false, jobStatus);
        await App.SKDR.setRunning(jobsFromId[0].scheduleId, false);
        this.runningJobs.delete(jobId);
        // TODO: log job result
        winston.info('Job result: ' + JSON.stringify(jobResult, null, 2));
      });

    });
  }

  private async _jobLoop(): Promise<void>
  {
    // TODO check the job queue for unlocked rows and detect which jobs should run next
    this._checkJobTable().catch((err) =>
    {
      winston.warn(err.toString() as string);
    });
    setTimeout(this._jobLoop.bind(this), INTERVAL - new Date().getTime() % INTERVAL);
  }

  private async _resetAllRunningJobs(): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      const runningJobs: JobConfig[] = await this._select([], { running: true }) as JobConfig[];
      runningJobs.forEach(async (val) =>
      {
        val.running = false;
        val.status = 'ABORTED';
        const updatedJob: JobConfig[] = await App.DB.upsert(this.jobTable, val) as JobConfig[];
      });
      resolve();
    });
  }

  private async _select(columns: string[], filter: object, locked?: boolean): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      let rawResults: object[] = [];
      if (locked === undefined) // all
      {
        rawResults = await App.DB.select(this.jobTable, columns, filter);
      }
      else if (locked === true) // currently running
      {
        // TODO
      }
      else // currently not running
      {
        // TODO
      }

      const results: JobConfig[] = rawResults.map((result: object) => new JobConfig(result));
      resolve(results);
    });
  }

  // Status codes: SUCCESS FAILURE PAUSED CANCELLED RUNNING ABORTED (PAUSED/RUNNING when midway was restarted)
  private async _setJobStatus(id: number, running: boolean, status: string): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const jobs: JobConfig[] = await this._select([], { id }) as JobConfig[];
      if (jobs.length === 0)
      {
        return resolve(false);
      }
      if (jobs[0].running === running)
      {
        return resolve(false);
      }
      jobs[0].running = running;
      jobs[0].status = status;
      const doNothing: JobConfig[] = await App.DB.upsert(this.jobTable, jobs[0]) as JobConfig[];
      resolve(true);
    });
  }

  // sets a job to be the top of the priority queue
  private async _setRunNow(job: JobConfig): Promise<JobConfig>
  {
    return new Promise<JobConfig>(async (resolve, reject) =>
    {
      let maxRunNowPriority: number = 1;
      const query = new Tasty.Query(this.jobTable).filter(this.jobTable['status'].equals('PENDING'))
        .filter(this.jobTable['running'].equals('false')).filter(this.jobTable['priority'].equals(0))
        .sort(this.jobTable['runNowPriority'], 'desc').take(1);
      const queryStr: string = App.DB.getDB().generateString(query);
      const rawResults = await App.DB.getDB().execute([queryStr]);

      const jobs: JobConfig[] = rawResults.map((result: object) => new JobConfig(result));
      if (jobs.length !== 0)
      {
        maxRunNowPriority = jobs[0].runNowPriority;
      }

      job.priority = 0;
      job.runNowPriority = maxRunNowPriority + 1;
      return resolve(job as JobConfig);
    });
  }
}

export default JobQueue;
