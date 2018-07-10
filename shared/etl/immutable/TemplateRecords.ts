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

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable

// tslint:disable-next-line
/// <reference path="../../../shared/typings/tsd.d.ts" />

import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import { makeExtendedConstructor, recordForSave, WithIRecord } from 'shared/util/Classes';

import
{
  _SinkConfig,
  _SourceConfig,
  ItemWithName,
  SINK_DEFAULT_NAME,
  SinkConfig,
  SOURCE_DEFAULT_NAME,
  SourceConfig,
} from 'shared/etl/immutable/EndpointRecords';
import { _ETLProcess, ETLEdge, ETLNode, ETLProcess } from 'shared/etl/immutable/ETLProcessRecords';
import { ReorderableSet } from 'shared/etl/immutable/ReorderableSet';
import { _TemplateSettings } from 'shared/etl/immutable/TemplateSettingsRecords';
import { _TemplateUIData } from 'shared/etl/immutable/TemplateUIDataRecords';
import TemplateUtil from 'shared/etl/immutable/TemplateUtil';
import { CURRENT_TEMPLATE_VERSION } from 'shared/etl/migrations/TemplateVersions';
import { SinkOptionsType, Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { Languages, NodeTypes, TemplateBase, TemplateObject } from 'shared/etl/types/ETLTypes';

export type SourcesMap = Immutable.Map<string, SourceConfig>;
export type SinksMap = Immutable.Map<string, SinkConfig>;

interface ETLTemplateI extends TemplateBase
{
  sources: SourcesMap;
  sinks: SinksMap;
  process: ETLProcess;
}

class ETLTemplateC implements ETLTemplateI
{
  public id = -1;
  public lastModified: Date = null;
  public createdAt: Date = null;
  public archived = false;
  public templateName = '';
  public process = _ETLProcess();
  public sources = Map<string, SourceConfig>();
  public sinks = Map<string, SinkConfig>();
  public settings = _TemplateSettings();
  public meta = { version: CURRENT_TEMPLATE_VERSION };
  public uiData = _TemplateUIData();

  // Returns true if and only if there is 1 sink and it is a database
  public isImport(): boolean
  {
    if (this.getSinks().size === 1)
    {
      const sink = this.getSinks().first();
      if (sink.type === Sinks.Database)
      {
        return true;
      }
    }
    return false;
  }

  public isUpload(): boolean
  {
    const uploadSource = this.getSources()
      .find((source) => source.type === Sources.Upload);
    return uploadSource !== undefined;
  }

  public canSchedule(
    overrideSources?: Immutable.Map<string, SourceConfig>,
    overrideSinks?: Immutable.Map<string, SinkConfig>,
  ): boolean
  {
    const template = this.applyOverrides(overrideSources, overrideSinks);
    return TemplateUtil.canSchedule(template);
  }

  public getDescription(algorithms?: Map<ID, ItemWithName>): string
  {
    let sourceText = '';
    this.getSources().forEach((source, key) =>
    {
      if (sourceText !== '')
      {
        sourceText = `${sourceText}, ${source.description(algorithms)}`;
      }
      else
      {
        sourceText = source.description(algorithms);
      }
    });
    if (this.getSources().size > 1)
    {
      sourceText = `[${sourceText}]`;
    }

    let sinkText = '';
    this.getSinks().forEach((sink, key) =>
    {
      if (sinkText !== '')
      {
        sinkText = `${sinkText}, ${sink.description()}`;
      }
      else
      {
        sinkText = sink.description();
      }
    });
    if (this.getSinks().size > 1)
    {
      sinkText = `[${sinkText}]'`;
    }

    const typeText = this.isImport() ? 'Import' : 'Export';
    return `${typeText} from ${sourceText} into ${sinkText}`;
  }

  public getSources()
  {
    return this.sources;
  }

  public getSinks()
  {
    return this.sinks;
  }

  public getSource(key): SourceConfig
  {
    return this.sources.get(key);
  }

  public getSink(key): SinkConfig
  {
    return this.sinks.get(key);
  }

  public getSourceName(key)
  {
    let sourceName = '';
    const source = this.getSource(key);
    if (source)
    {
      if (key === '_default')
      {
        sourceName = SOURCE_DEFAULT_NAME;
      }
      else
      {
        sourceName = source.name;
      }
    }

    return sourceName;
  }

  public getSinkName(key)
  {
    let sinkName = '';
    const sink = this.getSource(key);
    if (sink)
    {
      if (key === '_default')
      {
        sinkName = SINK_DEFAULT_NAME;
      }
      else
      {
        sinkName = sink.name;
      }
    }

    return sinkName;
  }

  public getNodeName(id: number)
  {
    return `Merge Node ${id}`;
  }

  public getTransformationEngine(edge: number)
  {
    return this.process.edges.getIn([edge, 'transformations']);
  }

  public getFieldOrdering(edgeId: number): ReorderableSet<number>
  {
    return this.uiData.getIn(['engineFieldOrders', edgeId]);
  }

  public getNode(id: number)
  {
    return this.process.nodes.get(id);
  }

  public getEdge(id: number)
  {
    return this.process.edges.get(id);
  }

  public getEdges(): Immutable.Map<number, ETLEdge>
  {
    return this.process.edges;
  }

  public getLastEdgeId(): number
  {
    const defaultSink = this.getDefaultSinkNodeId();
    const edges = this.findEdges((edge) => edge.to === defaultSink);
    return edges.size > 0 ? edges.first() : -1;
  }

  public getDefaultSinkNodeId(): number
  {
    return this.process.nodes.findKey(
      (node) => node.type === NodeTypes.Sink && node.endpoint === '_default',
    );
  }

  public getEdgeLanguage(edgeId: number): Languages
  {
    try
    {
      const edge = this.getEdge(edgeId);
      const toNode = this.getNode(edge.to);
      if (toNode.type === NodeTypes.Sink)
      {
        const sink = this.getSink(toNode.endpoint);
        if (sink.type === Sinks.Database)
        {
          return (sink.options as SinkOptionsType<Sinks.Database>).language;
        }
      }
      return Languages.JavaScript;
    }
    catch (e)
    {
      return Languages.JavaScript;
    }
  }

  public applyOverrides(
    sources?: Immutable.Map<string, SourceConfig>,
    sinks?: Immutable.Map<string, SinkConfig>,
  ): ETLTemplate
  {
    let template: ETLTemplate = this as any;
    if (sources !== undefined)
    {
      sources.forEach((source, key) =>
      {
        template = template.update('sources', (s) => s.set(key, source));
      });
    }
    if (sinks !== undefined)
    {
      sinks.forEach((sink, key) =>
      {
        template = template.update('sinks', (s) => s.set(key, sink));
      });
    }
    return template;
  }

  public getDefaultSource(): SourceConfig
  {
    return this.getSource('_default');
  }

  public getDefaultSink(): SinkConfig
  {
    return this.getSink('_default');
  }

  public getMergeableNodes(): List<number>
  {
    return this.findNodes((node) => node.type !== NodeTypes.Sink);
  }

  public findEdges(matcher: (e: ETLEdge) => boolean, edges = this.process.edges): List<number>
  {
    return edges.filter(matcher).keySeq().toList();
  }

  public findNodes(matcher: (n: ETLNode) => boolean): List<number>
  {
    return this.process.nodes.filter(matcher).keySeq().toList();
  }
}

export type ETLTemplate = WithIRecord<ETLTemplateC>;
export const _ETLTemplate = makeExtendedConstructor(ETLTemplateC, true, {
  sources: (sources) =>
  {
    return Map<string, SourceConfig>(sources)
      .map((obj, key) => _SourceConfig(obj, true))
      .toMap();
  },
  sinks: (sinks) =>
  {
    return Map<string, SinkConfig>(sinks)
      .map((obj, key) => _SinkConfig(obj, true))
      .toMap();
  },
  process: _ETLProcess,
  lastModified: (date) =>
  {
    return typeof date === 'string' ? new Date(date) : date;
  },
  createdAt: (date) =>
  {
    return typeof date === 'string' ? new Date(date) : date;
  },
  settings: _TemplateSettings,
  uiData: _TemplateUIData,
});

// todo, please do this more efficiently
export function copyTemplate(template: ETLTemplate): ETLTemplate
{
  const files = getSourceFiles(template);
  const objTemplate = templateForBackend(template);
  const objTemplateCopy = JSON.parse(JSON.stringify(objTemplate));
  const copiedTemplate = _ETLTemplate(objTemplateCopy, true);
  return restoreSourceFiles(copiedTemplate, files);
}

export function getSourceFiles(template: ETLTemplate): { [k: string]: File }
{
  const files = {};
  template.sources.forEach((source, key) =>
  {
    if (source.type === Sources.Upload)
    {
      const file = (source.options as SourceOptionsType<Sources.Upload>).file;
      if (file != null)
      {
        files[key] = file;
      }
    }
  });
  return files;
}

export function restoreSourceFiles(template: ETLTemplate, files: { [k: string]: File }): ETLTemplate
{
  return template.update('sources', (sources) =>
    sources.map((source, key) =>
    {
      if (source.type === Sources.Upload)
      {
        const options = source.options as SourceOptionsType<Sources.Upload>;
        return source.set('options', _.extend({}, options, { file: files[key] }));
      }
      else
      {
        return source;
      }
    }).toMap(),
  );
}

export function templateForBackend(template: ETLTemplate): TemplateBase
{
  const obj: TemplateObject = (template as any).toObject(); // shallow js object

  obj.sources = recordForSave(obj.sources);
  obj.sinks = recordForSave(obj.sinks);
  obj.settings = recordForSave(obj.settings);
  obj.uiData = recordForSave(obj.uiData);
  obj.process = obj.process.update('edges', (edges) => edges.map((edge, key) =>
  {
    return edge.set('transformations', JSON.stringify(edge.transformations.toJSON()));
  }).toMap());

  obj.process = recordForSave(obj.process);

  // strip file from upload sources
  _.forOwn(obj.sources, (source, key) =>
  {
    if (source.type === Sources.Upload)
    {
      let options = _.get(obj, ['sources', key, 'options'], {});
      options = _.extend({}, options);
      options['file'] = null;
      _.set(obj, ['sources', key, 'options'], options);
    }
  });
  return obj;
}
