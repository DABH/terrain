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
// tslint:disable:variable-name max-classes-per-file strict-boolean-expressions no-shadowed-variable
import { List, Record } from 'immutable';
import * as Immutable from 'immutable';
import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import * as _ from 'lodash';
import { TaskConfig as SharedTaskConfig } from 'shared/types/jobs/TaskConfig';
import TaskEnum from 'shared/types/jobs/TaskEnum';
import SharedSchedulerConfig from 'shared/types/scheduler/SchedulerConfig';
import { createRecordType } from 'shared/util/Classes';
import Util from 'util/Util';

class SchedulerConfigC extends SharedSchedulerConfig
{
  // if extra front-end specific functions or properties are needed, add here
  public isNew: boolean = false;
}

const SchedulerConfig_Record = createRecordType(new SchedulerConfigC(), 'SchedulerConfigC');
export interface SchedulerConfig extends SchedulerConfigC, IMap<SchedulerConfig> { }
export const _SchedulerConfig =
  (config: object) =>
  {
    let schedule = new SchedulerConfig_Record(config) as any as SchedulerConfig;
    let tasks: any = schedule.tasks;
    if (typeof schedule.tasks === 'string')
    {
      try
      {
        tasks = JSON.parse(schedule.tasks);
      }
      catch
      {
        tasks = [];
      }
    }
    if (!Array.isArray(tasks))
    {
      tasks = [tasks];
    }
    schedule = schedule.set('tasks', Util.arrayToImmutableList(tasks, _TaskConfig));
    return schedule;
  };

class SchedulerStateC
{
  public loading: boolean = true;
  public schedules: Immutable.Map<ID, SchedulerConfig> = Immutable.Map<ID, SchedulerConfig>({});
  public error: string = null;
}

const SchedulerState_Record = createRecordType(new SchedulerStateC(), 'SchedulerStateC');
export interface SchedulerState extends SchedulerStateC, IRecord<SchedulerState> { }
export const _SchedulerState = (config?: any) =>
{
  return new SchedulerState_Record(Util.extendId(config || {})) as any as SchedulerState;
};

class TaskConfigC extends SharedTaskConfig
{
  // Any extra functions / properties go here
  public type: 'ROOT' | 'SUCCESS' | 'FAILURE' = 'ROOT';
}

const TaskConfig_Record = createRecordType(new TaskConfigC(), 'TaskConfigC');
export interface TaskConfig extends TaskConfigC, IMap<TaskConfig> { }
export const _TaskConfig =
  (config: object) =>
  {
    let task = new TaskConfig_Record(config) as any as TaskConfig;
    task = task.set('params', task.params ? Immutable.Map(task.params) : Immutable.Map({}));
    if (task.taskId === TaskEnum.taskETL)
    {
      task = task.setIn(['params', 'options'], task.getIn(['params', 'options']) ?
        Immutable.Map(task.getIn(['params', 'options'])) : Immutable.Map({}));
      task = task.setIn(['params', 'options', 'overrideSources'],
        Util.objectToImmutableMap(parseToObject(task, ['params', 'options', 'overrideSources']), _.partialRight(_SourceConfig, true)));
      task = task.setIn(['params', 'options', 'overrideSinks'],
        Util.objectToImmutableMap(parseToObject(task, ['params', 'options', 'overrideSinks']), _.partialRight(_SinkConfig, true)));
    }
    return task;
  };

export interface ParamConfigTypes
{
  taskDefaultExit: {
  };
  taskDefaultFailure: {
  };
  taskETL: {
    templateId?: string | number;
    overrideSources?: Immutable.Map<ID, SourceConfig>;
    overrideSinks?: Immutable.Map<ID, SinkConfig>;
  };
}

export type TaskTypes = keyof ParamConfigTypes;
export type ParamConfigType<key extends TaskTypes> = ParamConfigTypes[key];

function parseToObject(parent, keyPath, defaultVal = {}): object
{
  if (parent.getIn(keyPath))
  {
    const obj = parent.getIn(keyPath);
    if (typeof obj === 'string')
    {
      try
      {
        return JSON.parse(obj);
      }
      catch {
        return defaultVal;
      }
    }
    return obj;
  }
  return defaultVal;
}

/* Do any work to prepare a schedule to be saved to the database */
export function scheduleForDatabase(schedule: SchedulerConfig): object
{
  const tasks = schedule.tasks.map((task) =>
  {
    if (task.taskId === TaskEnum.taskETL)
    {
      task = task
        .updateIn(['params', 'options', 'overrideSinks'], (value) => JSON.stringify(value))
        .updateIn(['params', 'options', 'overrideSources'], (value) => JSON.stringify(value));
    }
  });
  return schedule.update('tasks', (value) => JSON.stringify(value)).toJS();
}
