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

import * as stream from 'stream';
import * as consume from 'stream-consume';

import { TaskConfig } from 'shared/types/jobs/TaskConfig';
import { TaskOutputConfig } from 'shared/types/jobs/TaskOutputConfig';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import IntegrationConfig from '../integrations/IntegrationConfig';
import { integrations } from '../integrations/IntegrationRouter';
import { MidwayLogger } from '../log/MidwayLogger';
import SchedulerConfig from '../scheduler/SchedulerConfig';
import { Job } from './Job';
import JobConfig from './JobConfig';
import JobLogConfig from './JobLogConfig';

const INTERVAL: number = 60000;

export class JobQueue
{
  private jobTable: Tasty.Table;
  private maxConcurrentJobs: number;
  private maxConcurrentRunNowJobs: number;
  private runningJobs: Map<number, Job>;
  private runningRunNowJobs: Map<number, Job>;

  public initialize()
  {
    this.maxConcurrentJobs = 1;
    this.maxConcurrentRunNowJobs = 50; // if we hit this limit something went very, very wrong (which means it'll happen someday)
    this.runningJobs = new Map<number, Job>();
    this.runningRunNowJobs = new Map<number, Job>();
    this.jobTable = App.TBLS.jobs;
  }

  public cancel(id: number): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      try
      {
        if (this.runningJobs.get(id) !== undefined)
        {
          // send the cancel signal to the Job
          this.runningJobs.get(id).cancel();

          // delete the Job from the runningJobs map
          this.runningJobs.delete(id);

          // set status to CANCELED
          await this.setJobStatus(id, false, 'CANCELED');
          return resolve(await this.get(id) as JobConfig[]);
        }
        else if (this.runningRunNowJobs.get(id) !== undefined)
        {
          // send the cancel signal to the Run Now Job
          this.runningRunNowJobs.get(id).cancel();

          // delete the Run Now Job from the runningRunNowJobs map
          this.runningRunNowJobs.delete(id);

          // set status to CANCELED
          await this.setJobStatus(id, false, 'CANCELED');
          return resolve(await this.get(id) as JobConfig[]);
        }
      }
      catch (e)
      {
        // do nothing, job was not found
      }
      return resolve([] as JobConfig[]);
    });
  }

  /*
   * PARAMS: job.tasks (TaskConfig[] ==> string)
   *
   */
  public async create(job: JobConfig, runNow?: boolean, userId?: number): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      let tasksAsTaskConfig: TaskConfig[] = [];
      try
      {
        tasksAsTaskConfig = JSON.parse(job.tasks);
      }
      catch (e)
      {
        MidwayLogger.warn('Error while trying to parse tasks: ' + ((e as any).toString() as string));
      }
      if (!Array.isArray(tasksAsTaskConfig))
      {
        return reject(new Error('Tasks is not an array.'));
      }
      if (job.id !== undefined && job.id !== null)
      {
        return reject(new Error('Job ID must not be provided as it is autogenerated'));
      }
      // != undefined is a way to include both undefined and null
      job.createdAt = new Date();
      if (job.id === null)
      {
        delete job.id;
      }
      job.createdBy = userId !== undefined ? userId : null;
      job.endTime = null;
      job.meta = (job.meta !== undefined && job.meta !== null) ? job.meta : '';
      job.name = (job.name !== undefined && job.name !== null) ? job.name : '';
      job.pausedFilename = (job.pausedFilename !== undefined && job.pausedFilename !== null) ? job.pausedFilename : '';
      job.priority = (job.priority !== undefined && job.priority !== null) ? job.priority : 1;
      job.running = (job.running !== undefined && job.running !== null) ? job.running : false;
      job.runNowPriority = (job.runNowPriority !== undefined && job.runNowPriority !== null) ? job.runNowPriority : 1;
      job.scheduleId = (job.scheduleId !== undefined) ? job.scheduleId : null;
      job.startTime = null;
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

  public async delete(id: number): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      const jobs: JobConfig[] = await this.get(id);
      if (jobs.length === 0)
      {
        return reject(new Error('Job does not exist'));
      }
      const doNothing: JobConfig[] = await App.DB.delete(this.jobTable, { id }) as JobConfig[];
      return resolve([jobs[0]] as JobConfig[]);
    });
  }

  public async get(id?: number, running?: boolean): Promise<JobConfig[]>
  {
    return this._select([], { id, running });
  }

  public async getLog(id?: number): Promise<JobLogConfig>
  {
    return new Promise<JobLogConfig>(async (resolve, reject) =>
    {
      const jobs: JobConfig[] = await this.get(id);
      if (jobs.length === 0)
      {
        throw new Error('Job not found.');
      }
      const jobLogConfig: JobLogConfig[] = await App.JobL.get(id);
      return resolve(jobLogConfig[0]);
    });
  }

  public async initializeJobQueue(): Promise<void>
  {
    // set all jobs that are currently running to ABORTED
    await this._resetAllRunningJobs();

    setTimeout(this._jobLoop.bind(this), INTERVAL - new Date().getTime() % INTERVAL);
  }

  public async pause(id: number): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      try
      {
        this.runningJobs.get(id).pause();
        await this.setJobStatus(id, true, 'PAUSED');
        return resolve(await this.get(id) as JobConfig[]);
      }
      catch (e)
      {
        // do nothing, job was not found
      }
      return resolve([] as JobConfig[]);
    });
  }

  public async run(id: number): Promise<JobConfig[]> // runs the job and returns immediately
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      const getJobs: JobConfig[] = await this.get(id, false) as JobConfig[];
      if (getJobs.length === 0)
      {
        return reject(new Error('Job not found.'));
      }

      await this.setJobStatus(id, true, 'RUNNING');
      getJobs[0] = await this._setRunNow(getJobs[0]);
      return resolve(await App.DB.upsert(this.jobTable, getJobs[0]) as JobConfig[]);
    });
  }

  // runs the job and returns a resolved Promise of a stream
  public async runNow(id: number, fields: object, files: stream.Readable[]): Promise<stream.Readable>
  {
    return new Promise<stream.Readable>(async (resolve, reject) =>
    {
      const getJobs: JobConfig[] = await this.get(id, false) as JobConfig[];
      if (getJobs.length === 0)
      {
        return reject(new Error('Job not found.'));
      }

      if (this.runningRunNowJobs.size >= this.maxConcurrentRunNowJobs)
      {
        return reject(new Error('Too many jobs set to run now currently in the queue.'));
      }
      const status: boolean = await this.setJobStatus(getJobs[0].id, true, 'RUNNING');
      if (!status)
      {
        MidwayLogger.warn('Job running status was not toggled.');
      }
      const newJob: Job = new Job();
      let newJobTasks: TaskConfig[] = [];
      try
      {
        newJobTasks = JSON.parse(getJobs[0].tasks);
        newJobTasks[0].params =
          {
            options:
              {
                overrideSinks: fields['overrideSinks'],
                overrideSources: fields['overrideSources'],
                template: fields['template'],
                templateId: fields['templateId'],
                inputStreams: files,
              },
          };
      }
      catch (e)
      {
        MidwayLogger.warn(((e as any).toString() as string));
      }

      const jobCreationStatus: boolean | string = newJob.create(newJobTasks, 'some random filename');
      MidwayLogger.info('created run now job');
      if (typeof jobCreationStatus === 'string' || (jobCreationStatus as boolean) !== true)
      {
        MidwayLogger.warn('Error while creating job: ' + (jobCreationStatus as string));
      }

      try
      {
        // update the table to running = true
        this.runningRunNowJobs.set(getJobs[0].id, newJob);
        // actually run the job
        const jobResult: TaskOutputConfig = await this.runningRunNowJobs.get(getJobs[0].id).run() as TaskOutputConfig;
        const jobsFromId: JobConfig[] = await this.get(getJobs[0].id);

        // log job result
        const jobLogConfig: JobLogConfig[] = await App.JobL.create(getJobs[0].id, jobResult.rootLogStream,
          jobResult.status, true);

        // await this._setJobLogId(getJobs[0].id, jobLogConfig[0].id);

        if (jobResult.options.outputStream === null)
        {
          await App.JobQ.setJobStatus(getJobs[0].id, false, 'FAILURE');
          reject(new Error('Error while running job'));
        }
        resolve(jobResult.options.outputStream as stream.Readable);
      }
      catch (e)
      {
        await App.JobQ.setJobStatus(getJobs[0].id, false, 'FAILURE');
        reject(new Error('Error while running job'));
      }
    });
  }

  public deleteRunningJob(id: number, runNow?: boolean): boolean
  {
    try
    {
      if (runNow === true)
      {
        this.runningRunNowJobs.delete(id);
      }
      else
      {
        this.runningJobs.delete(id);
      }
    }
    catch (e)
    {
      MidwayLogger.warn((e as any).toString() as string);
      return false;
    }
    return true;
  }

  // Status codes: PENDING SUCCESS FAILURE PAUSED CANCELED RUNNING ABORTED (PAUSED/RUNNING when midway was restarted)
  public async setJobStatus(id: number, running: boolean, status: string, jobLogId?: number): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const jobs: JobConfig[] = await this._select([], { id }) as JobConfig[];
      MidwayLogger.info(`setting job status to ${running}, status ${status}`);
      if (jobs.length === 0)
      {
        return resolve(false);
      }
      if (jobs[0].running === running)
      {
        return resolve(false);
      }

      if (jobs[0].running === false && running === true) // set start time
      {
        jobs[0].startTime = new Date();
      }
      if (jobs[0].running === true && running === false) // set end time
      {
        jobs[0].endTime = new Date();
      }

      jobs[0].running = running;
      jobs[0].status = status;
      if (jobLogId !== undefined)
      {
        jobs[0].logId = jobLogId;
      }

      const doNothing: JobConfig[] = await App.DB.upsert(this.jobTable, jobs[0]) as JobConfig[];

      if (status === 'FAILURE')
      {
        await this._sendEmail(id);
      }

      resolve(true);
    });
  }

  public async setScheduleStatus(id: number, status: boolean = false): Promise<void>
  {
    const jobs: JobConfig[] = await this.get(id);
    if (!(status === false && jobs[0].scheduleId === null))
    {
      await App.SKDR.setRunning(jobs[0].scheduleId, status);
    }
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
          await this.setJobStatus(id, true, 'RUNNING');

          // resolve updated job so that we can continue execution without blocking on the response
          resolve(await this.get(id) as JobConfig[]);

          // run job as normal
          const jobResult: TaskOutputConfig = await this.runningJobs.get(id).run() as TaskOutputConfig;
          const jobsFromId: JobConfig[] = await this.get(id);
          const jobStatus: string = jobResult.status === true ? 'SUCCESS' : 'FAILURE';
          await this.setJobStatus(id, false, jobStatus);
          await App.SKDR.setRunning(jobsFromId[0].scheduleId, false);
          this.runningJobs.delete(id);

          const jobLogConfig: JobLogConfig[] = await App.JobL.create(id, jobResult.rootLogStream);
          // await this._setJobLogId(id, jobLogConfig[0].id);
        }
      }
      catch (e)
      {
        // do nothing, job was not found
      }
      return reject(new Error('Job not found.'));
    });
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
        .filter(this.jobTable['priority'].greaterThan(-1))
        .filter(this.jobTable['running'].equals(false)).sort(this.jobTable['priority'], 'asc')
        .sort(this.jobTable['runNowPriority'], 'desc').sort(this.jobTable['createdAt'], 'asc').take(newJobSlots);
      const generatedQuery = App.DB.getDB().generate(query);
      const jobs = await App.DB.getDB().execute(generatedQuery) as JobConfig[];

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
            MidwayLogger.warn(((e as any).toString() as string));
          }

          const jobCreationStatus: boolean | string = newJob.create(newJobTasks, 'some random filename');
          MidwayLogger.info('created job');
          if (typeof jobCreationStatus === 'string' || (jobCreationStatus as boolean) !== true)
          {
            MidwayLogger.warn('Error while creating job: ' + (jobCreationStatus as string));
          }
          // update the table to running = true

          this.runningJobs.set(nextJob.id, newJob);
          const status: boolean = await this.setJobStatus(nextJob.id, true, 'RUNNING');
          if (!status)
          {
            MidwayLogger.warn('Job running status was not toggled.');
          }
          jobIdLst.push(nextJob.id);
          ++i;
        }
      }

      resolve();
      jobIdLst.forEach(async (jobId) =>
      {
        try
        {
          const jobResult: TaskOutputConfig = await this.runningJobs.get(jobId).run() as TaskOutputConfig;
          const jobsFromId: JobConfig[] = await this.get(jobId);
          const jobStatus: string = jobResult.status === true ? 'SUCCESS' : 'FAILURE';

          const jobLogConfig: JobLogConfig[] = await App.JobL.create(jobId, jobResult.rootLogStream, jobResult.status, false);
          // await this._setJobLogId(jobId, jobLogConfig[0].id);
          if (jobResult.options.outputStream === null)
          {
            await App.JobQ.setJobStatus(jobId, false, 'FAILURE');
            reject(new Error('Error while running job'));
          }
          consume(jobResult.options.outputStream as stream.Readable);
        }
        catch (e)
        {
          await App.JobQ.setJobStatus(jobId, false, 'FAILURE');
          reject(new Error('Error while running job'));
        }
      });

    });
  }

  private async _jobLoop(): Promise<void>
  {
    // TODO check the job queue for unlocked rows and detect which jobs should run next
    this._checkJobTable().catch((err) =>
    {
      MidwayLogger.warn(err.toString() as string);
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
    if (locked === undefined) // all
    {
      return App.DB.select(this.jobTable, columns, filter) as Promise<JobConfig[]>;
    }
    else if (locked === true) // currently running
    {
      // TODO
      MidwayLogger.info('not implemented');
      return [];
    }
    else // currently not running
    {
      // TODO
      MidwayLogger.info('not implemented');
      return [];
    }
  }

  private async _sendEmail(jobId: number): Promise<void>
  {
    const emailIntegrations: IntegrationConfig[] = await integrations.get(null, undefined, 'Email', true) as IntegrationConfig[];
    if (emailIntegrations.length !== 1)
    {
      MidwayLogger.warn(`Invalid number of email integrations, found ${emailIntegrations.length}`);
    }
    else if (emailIntegrations.length === 1 && emailIntegrations[0].name !== 'Default Failure Email')
    {
      MidwayLogger.warn('Invalid Email found.');
    }
    else
    {
      const jobs: JobConfig[] = await App.JobQ.get(jobId) as JobConfig[];
      const jobLogs: JobLogConfig[] = await App.JobL.get(jobId) as JobLogConfig[];
      if (jobs.length !== 0 && jobLogs.length !== 0)
      {
        if (jobs[0].scheduleId !== undefined)
        {
          const schedules: SchedulerConfig[] = await App.SKDR.get(jobs[0].scheduleId) as SchedulerConfig[];
          if (schedules.length !== 0)
          {
            const connectionConfig = emailIntegrations[0].connectionConfig;
            const authConfig = emailIntegrations[0].authConfig;
            const fullConfig = Object.assign(connectionConfig, authConfig);
            if (!(fullConfig['customerName'] == null || fullConfig['customerName'] === ''))
            {
              const subject: string = `[${fullConfig['customerName']}] Schedule "${schedules[0].name}" failed at job ${jobs[0].id}`;
              const body: string = 'Check the job log table for details'; // should we include the log contents? jobLogs[0].contents
              const emailSendStatus: boolean = await App.EMAIL.send(emailIntegrations[0].id, subject, body);
              MidwayLogger.info(`Email ${emailSendStatus === true ? 'sent successfully' : 'failed'}`);
            }
          }
        }
      }
    }
  }

  private async _setJobLogId(id: number, jobLogId: number): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const jobs: JobConfig[] = await this._select([], { id }) as JobConfig[];
      if (jobs.length === 0)
      {
        return resolve(false);
      }

      jobs[0].logId = jobLogId;
      const doNothing: JobConfig[] = await App.DB.upsert(this.jobTable, jobs[0]) as JobConfig[];
      resolve(true);
    });
  }

  // sets a job to be the top of the running priority queue
  private async _setRunNow(job: JobConfig): Promise<JobConfig>
  {
    return new Promise<JobConfig>(async (resolve, reject) =>
    {
      let maxRunNowPriority: number = 1;
      const query = new Tasty.Query(this.jobTable).filter(this.jobTable['status'].equals('PENDING'))
        .filter(this.jobTable['running'].equals(false)).filter(this.jobTable['priority'].equals(0))
        .sort(this.jobTable['runNowPriority'], 'desc').take(1);
      const generatedQuery = App.DB.getDB().generate(query);
      const jobs = await App.DB.getDB().execute(generatedQuery) as JobConfig[];
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
