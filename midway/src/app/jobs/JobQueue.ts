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
import * as runQueue from 'run-queue';
import * as winston from 'winston';

import { TaskConfig } from 'shared/types/jobs/TaskConfig';
import { TaskOutputConfig } from 'shared/types/jobs/TaskOutputConfig';
import { TaskTreeConfig } from 'shared/types/jobs/TaskTreeConfig';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import { Job } from './Job';
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
        'meta',
        'name',
        'pausedFilename',
        'priority',
        'running',
        'scheduleId',
        'status',
        'tasks',
        'type',
        'workerId',
      ],
    );
  }

  public cancel(id: number): boolean
  {
    try
    {
      this.jobs.get(id).cancel();
      return true;
    }
    catch (e)
    {
      // do nothing, job was not found
    }
    return false;
  }

  /*
   * PARAMS: job.tasks (TaskConfig[] ==> string)
   *
   */
  public async create(job: JobConfig): Promise<JobConfig[] | string>
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
      job.meta = (job.meta !== undefined && job.meta !== null) ? job.meta : '';
      job.name = (job.name !== undefined && job.name !== null) ? job.name : '';
      job.pausedFilename = (job.pausedFilename !== undefined && job.pausedFilename !== null) ? job.pausedFilename : '';
      job.priority = (job.priority !== undefined && job.priority !== null) ? job.priority : 1;
      job.running = (job.running !== undefined && job.running !== null) ? job.running : false;
      job.scheduleId = (job.scheduleId !== undefined) ? job.scheduleId : null;
      job.status = (job.status !== undefined && job.status !== null) ? job.status : 'pending';
      job.tasks = (job.tasks !== undefined && job.tasks !== null) ? job.tasks : '[]';
      job.type = (job.type !== undefined && job.type !== null) ? job.type : 'default';
      job.workerId = (job.workerId !== undefined && job.workerId !== null) ? job.workerId : 1;
      const upsertedJobs: JobConfig[] = await App.DB.upsert(this.jobTable, job) as JobConfig[];
      // check table to see if jobs need to be run
      await this._checkJobTable();
      resolve(upsertedJobs);
    });
  }

  public async get(id?: number, running?: boolean): Promise<JobConfig[]>
  {
    return this._select([], { id, running });
  }

  public pause(): void
  {
    if (this.taskTree.isCancelled() === false)
    {
      this.taskTree.pause();
    }
  }

  public async unpause(): Promise<void>
  {
    if (this.taskTree.isCancelled() === true)
    {
      await this.run();
    }
  }

  public async printTree(): Promise<void>
  {
    await this.taskTree.printTree();
  }

  public async run(): Promise<TaskOutputConfig>
  {
    this.jobs.set(job.id, new Job());
    this.tasks = args;
    const taskTreeConfig: TaskTreeConfig =
      {
        cancel: false,
        filename: filename !== undefined ? filename : '',
        jobStatus: 0,
        paused: -1,
      };
    return this.taskTree.create(tasksAsTaskConfig, taskTreeConfig);
  }

  public async initializeJobQueue(): Promise<void>
  {
    setTimeout(this._jobLoop.bind(this), INTERVAL - new Date().getTime() % INTERVAL);
  }

  public async setJobStatus(id: number, running: boolean): Promise<bool>
  {
    return new Promise<bool>(async (resolve, reject) =>
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
      await App.DB.upsert(this.jobTable, jobs[0]) as JobConfig[];
      resolve(true);
    });
  }

  private async _checkJobTable(): Promise<void>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const jobIdLst: number[] = [];
      const numRunningJobs: number = this.runningJobs.size;
      const newJobSlots: number = this.maxConcurrentJobs - numRunningJobs;
      if (newJobSlots <= 0) // there are no slots for new jobs
      {
        return resolve();
      }
      const query = new Tasty.Query(this.jobTable).filter(this.jobTable['running'].equals(false))
        .sort(this.jobTable['priority'], 'asc').sort(this.jobTable['createdAt'], 'asc').take(newJobSlots);
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
          const status: boolean = await this.setJobStatus(nextJob.id, true);
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
        const jobs: JobConfig[] = await this.get(jobId);
        await this.setJobStatus(jobs[0].id, false);
        // log job result
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
}

export default JobQueue;
