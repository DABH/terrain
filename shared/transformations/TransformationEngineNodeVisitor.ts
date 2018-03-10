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

// import * as winston from 'winston';
import {KeyPath} from '../util/KeyPath';
import * as yadeep from '../util/yadeep';
import AppendTransformationNode from './nodes/AppendTransformationNode';
import DuplicateTransformationNode from './nodes/DuplicateTransformationNode';
import FilterTransformationNode from './nodes/FilterTransformationNode';
import GetTransformationNode from './nodes/GetTransformationNode';
import JoinTransformationNode from './nodes/JoinTransformationNode';
import LoadTransformationNode from './nodes/LoadTransformationNode';
import PlusTransformationNode from './nodes/PlusTransformationNode';
import PrependTransformationNode from './nodes/PrependTransformationNode';
import PutTransformationNode from './nodes/PutTransformationNode';
import SplitTransformationNode from './nodes/SplitTransformationNode';
import StoreTransformationNode from './nodes/StoreTransformationNode';
import SubstringTransformationNode from './nodes/SubstringTransformationNode';
import TransformationNode from './nodes/TransformationNode';
import UppercaseTransformationNode from './nodes/UppercaseTransformationNode';
import TransformationNodeType, { NodeOptionsType } from './TransformationNodeType';
import TransformationNodeVisitor from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

export default class TransformationEngineNodeVisitor extends TransformationNodeVisitor
{
  public applyTransformationNode(node: TransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    if (node === undefined)
    {
      return {} as TransformationVisitResult;
    }

    return node.accept(this, doc, options);
  }

  public visitDefault(node: TransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public visitAppendNode(node: AppendTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitDuplicateNode(node: DuplicateTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitFilterNode(node: FilterTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitGetNode(node: GetTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitJoinNode(node: JoinTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitLoadNode(node: LoadTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitPlusNode(node: PlusTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitPrependNode(node: PrependTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitPutNode(node: PutTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitSplitNode(node: SplitTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitStoreNode(node: StoreTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    // TODO
    return this.visitDefault(node, doc, options);
  }

  public visitSubstringNode(node: SubstringTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.SubstringNode>;
    node.fields.forEach((field) =>
    {
        const el: any = yadeep.get(doc, field);
      if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to take a substring of a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      if (!opts.hasOwnProperty('from') || opts['from'] < 0)
      {
        return {
          errors: [
            {
              message: 'Substring node: "from" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      if (!opts.hasOwnProperty('length') || opts['length'] < 0)
      {
        return {
          errors: [
            {
              message: 'Substring node: "length" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      // Currently assumes a single from and length for all fieldIDs
      yadeep.set(doc, field, el.substr(opts['from'], opts['length']), { create: true });
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public visitUppercaseNode(node: UppercaseTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    console.log('here!');
    console.log(node.fields);
    node.fields.forEach((field) =>
    {
        const el: any = yadeep.get(doc, field);
        console.log('AAAAA ' + field);
        console.log(el);
      if (el.constructor === Array)
      {
        for (let i: number = 0; i < Object.keys(el).length; i++)
        {
            console.log('FLLLLL ' + i);
            let kpi: KeyPath = field;
            if (kpi.contains('*'))
            {
                kpi = kpi.set(kpi.indexOf('*'), i.toString());
            }
            else
            {
                kpi = kpi.push(i.toString());
            }
          // console.log(doc[fieldID][i]);
            yadeep.set(doc, kpi, yadeep.get(doc, kpi).toUpperCase());
          //doc[fieldID][i] = doc[fieldID][i].toUpperCase();
        }
      }
      else if (typeof el !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to capitalize a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      else
      {
          yadeep.set(doc, field, el.toUpperCase());
      }
    });

    return {
      document: doc,
    } as TransformationVisitResult;
  }
}
