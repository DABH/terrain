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
// tslint:disable:no-console strict-boolean-expressions
import Colors from 'app/colors/Colors';
import RouteSelector from 'app/common/components/RouteSelector';
import EndpointForm from 'app/etl/common/components/EndpointForm';
import { _SinkConfig, _SourceConfig, SourceConfig, SinkConfig } from 'shared/etl/immutable/EndpointRecords';
import { ETLActions } from 'app/etl/ETLRedux';
import { ETLState } from 'app/etl/ETLTypes';
import { SchedulerActions } from 'app/scheduler/data/SchedulerRedux';
import { _SchedulerConfig, SchedulerConfig, SchedulerState } from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import { List, Map } from 'immutable';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';

import './Schedule.less';

export interface Props
{
  schedule: SchedulerConfig;
  algorithms: Immutable.Map<ID, Algorithm>;
  templates: List<any>;
  onDelete: (id: ID) => void;
  onChange: (newSchedule: SchedulerConfig) => void;
  onRun: (id: ID) => void;
  onPause: (id: ID) => void;
}

interface State
{
  configurationKey: string;
  overrideSources: Immutable.Map<string, SourceConfig>;
  overrideSinks: Immutable.Map<string, SinkConfig>;
}

class Schedule extends TerrainComponent<Props>
{
  /* UI */

  public state: State = {
    configurationKey: '',
    overrideSources: Map({}),
    overrideSinks: Map({}),
  };

  public componentDidMount()
  {
    this.updateOverrides(this.props.schedule);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    // console.log('will recive props ');
    // console.log('next props ', nextProps.schedule);
    // console.log('this props ', this.props.schedule);
    // console.log(this.props.schedule !== nextProps.schedule);
    // If the override sources or sinks change, update the memoized overrides
    if (this.props.schedule !== nextProps.schedule)
    {
      const oldTask: any = this.props.schedule.tasks;
      const newTask: any = nextProps.schedule.tasks;
      const oldSources = oldTask && oldTask.params && oldTask.params.overrideSources;
      const oldSinks = oldTask && oldTask.params && oldTask.params.overrideSinks;
      const newSources = newTask && newTask.params && newTask.params.overrideSources;
      const newSinks = newTask && newTask.params && newTask.params.overrideSinks;
      if (oldSinks !== newSinks || oldSources !== newSources)
      {
        this.updateOverrides(nextProps.schedule);
      }
    }
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State)
  {
    return nextProps !== this.props || nextState !== this.state;
  }

  public updateOverrides(schedule)
  {
    console.log('update the overrides');
    const task: any = schedule.tasks;
    let sources = Map({});
    let sinks = Map({});
    if (task['params'] && task['params']['overrideSources'])
    {
      const sourceObj = task['params']['overrideSources'];
      _.keys(sourceObj).forEach((key) =>
      {
        sources = sources.set(key, _SourceConfig(sourceObj[key]));
      });
    }
    if (task['params'] && task['params']['overrideSinks'])
    {
      const sinkObj = task['params']['overrideSinks'];
      _.keys(sinkObj).forEach((key) =>
      {
        sinks = sinks.set(key, _SinkConfig(sinkObj[key]));
      });
    }
    console.log('they are ', sources, sinks);
    this.setState({
      overrideSources: sources,
      overrideSinks: sinks,
    })
  }

  public getSourceSinkDescription(schedule: SchedulerConfig, template)
  {
    if (!template)
    {
      return '--';
    }
    template = template.applyOverrides(this.state.overrideSources, this.state.overrideSinks);
    return template.getDescription(this.props.algorithms);
  }

  public handleConfigurationChange(schedule: SchedulerConfig, isSource: boolean, key: string, endpoint)
  {
    const task = Object.assign({}, schedule.tasks);
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    if (!task['params'])
    {
      task['params'] = {};
    }
    if (!task['params'][sourceKey])
    {
      task['params'][sourceKey] = {};
    }
    console.log(sourceKey, key);
    console.log('end point ', endpoint);
    console.log('end point js ', endpoint.toJS());
    console.log('copy is ', Object.assign({}, endpoint.toJS()));
    delete task['params'][sourceKey][key];
    task['params'][sourceKey][key] = Object.assign({}, endpoint.toJS());
    console.log(task);
    const newSchedule = schedule
      .set('tasks', task);
    console.log('the new schedule is ', newSchedule);
    this.props.onChange(newSchedule);
  }

  public getEndPointOptions(endpoints: Map<string, any>, isSource: boolean, schedule)
  {
    const keys = _.keys(endpoints.toJS());
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    return List(keys.map((key) =>
    {
      const endpoint = (this.state[sourceKey] as any).get(key) || endpoints.get(key);
      return {
        value: isSource ? 'source' + key : 'sink' + key,
        displayName: endpoint.name,
        component: <EndpointForm
          isSource={isSource}
          endpoint={endpoint}
          onChange={this._fn(this.handleConfigurationChange, schedule, isSource, key)}
          isSchedule={true}
        />,
      };
    }));
  }

  public getOptionSets()
  {
    const { schedule } = this.props;
    const task: any = schedule.tasks;
    // Template Option Set
    const templateOptions = this.props.templates.map((t) =>
    {
      return {
        value: t.id,
        displayName: t.templateName,
      };
    }).toList();
    const templateOptionSet = {
      key: 'template',
      options: templateOptions,
      shortNameText: 'Template',
      column: true,
      forceFloat: true,
      getCustomDisplayName: this.getTemplateName,
    };

    // Configuration Option Set (Based on Template)
    let configurationOptions = List([]);
    let configurationHeaderText = 'Choose a Template';
    let template;
    if (task && task.params && task.params.templateId !== undefined)
    {
      template = this.props.templates.filter((temp) => temp.id === task.params.templateId).get(0);
      configurationHeaderText = '';
      if (template)
      {
        const sources = template.sources;
        const sinks = template.sinks;
        const sourceOptions = this.getEndPointOptions(sources, true, schedule);
        const sinkOptions = this.getEndPointOptions(sinks, false, schedule);
        configurationOptions = sourceOptions.concat(sinkOptions).toList();
      }
    }
    const configurationOptionSet = {
      key: 'configuration',
      options: configurationOptions,
      shortNameText: 'Configuration',
      headerText: configurationHeaderText,
      column: true,
      forceFloat: true,
      getCustomDisplayName: this._fn(this.getSourceSinkDescription, schedule, template),
    };

    // CRON Option Set
    const intervalOptionSet = {
      column: true,
      shortNameText: 'Interval',
      forceFloat: true,
      key: 'interval',
      options: List([{ value: 'CRON SELECTOR GOES HERE' }]),
    };

    // Status Options
    const statusOptions = List([
      {
        value: 'active',
        displayName: 'Active',
      },
      {
        value: 'running',
        displayName: 'Running',
        color: Colors().success,
      },
      {
        value: 'disabled',
        displayName: 'Disabled',
        color: Colors().error,
      },
    ]);

    const statusOptionSet = {
      column: true,
      options: statusOptions,
      key: 'status',
      shortNameText: 'Status',
      forceFloat: true,
    };

    // Buttons to Run / Pause
    const buttonOptionSet = {
      isButton: true,
      onButtonClick: this._fn(this.handleRunPause, schedule),
      key: 'run',
      options: List([]),
      column: true,
    };

    // Log of Past Runs

    return List([templateOptionSet, configurationOptionSet, intervalOptionSet, statusOptionSet, buttonOptionSet]);
  }

  // TODO NEED OPTION FOR UNPAUSE
  public handleRunPause(schedule)
  {
    if (schedule.running)
    {
      this.props.onRun(schedule.id);
    }
    else
    {
      this.props.onPause(schedule.id);
    }
  }

  public getValues()
  {
    const { schedule } = this.props;
    const task: any = schedule.tasks;
    const templateId = this.getTemplateId(schedule);
    const buttonValue = schedule.running ? 'Pause' : 'Run Now';
    const status = task && task.jobStatus !== undefined ? task.jobStatus : 0;
    const statusValue = status === 0 ? 'Active' : status === 1 ? 'Running' : 'Paused';
    return List([templateId, this.state.configurationKey, 'every day!', statusValue, buttonValue]);
  }

  public getTemplateId(schedule)
  {
    const task: any = schedule.tasks;
    if (task && task.params && task.params.templateId !== undefined )
    {
      return task.params.templateId;
    }
    return -1
  }

  public getTemplateName(templateId: ID, index: number)
  {
    const template = this.props.templates.filter((temp) => temp.id === templateId).get(0);
    const templateName = template ? template.templateName : 'None';
    return templateName;
  }

  public handleScheduleChange(optionSetIndex: number, value: any)
  {
    let { schedule } = this.props;
    switch (optionSetIndex)
    {
      case 0: // Template
        const task = schedule.tasks;
        if (task && !task['params'])
        {
          task['params'] = {};
        }
        task['params']['templateId'] = value;
        // Get rid of overrides
        task['params']['overrideSources'] = {};
        task['params']['overrideSinks'] = {};
        schedule = schedule.set('tasks', task);
        this.props.onChange(schedule);
        break;
      case 1: // Configuration
        this.setState({
          configurationKey: value,
        });
        break;
      case 2: // CRON
      case 3:
      default:
        break;
    }
  }

  public canEdit()
  {
    return !this.props.schedule.running && TerrainTools.isAdmin();
  }

  public render()
  {
    const { schedule } = this.props;
    return (
      <RouteSelector
        optionSets={this.getOptionSets()}
        values={this.getValues()}
        canEdit={this.canEdit()}
        canDelete={this.canEdit()}
        onDelete={this._fn(this.props.onDelete, schedule.id)}
        onChange={this.handleScheduleChange}
        useTooltip={true}
      />
    );
  }
}

export default Schedule;
