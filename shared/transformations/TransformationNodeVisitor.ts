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
import { TransformationNode } from './TransformationNode';
import TransformationNodeType from './TransformationNodeType';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';
import ANodeVisitor from './visitors/ANodeVisitor';
import AppendNodeVisitor from './visitors/AppendNodeVisitor';
import DuplicateNodeVisitor from './visitors/DuplicateNodeVisitor';
import FilterNodeVisitor from './visitors/FilterNodeVisitor';
import GetNodeVisitor from './visitors/GetNodeVisitor';
import JoinNodeVisitor from './visitors/JoinNodeVisitor';
import LoadNodeVisitor from './visitors/LoadNodeVisitor';
import PlusNodeVisitor from './visitors/PlusNodeVisitor';
import PrependNodeVisitor from './visitors/PrependNodeVisitor';
import PutNodeVisitor from './visitors/PutNodeVisitor';
import SplitNodeVisitor from './visitors/SplitNodeVisitor';
import StoreNodeVisitor from './visitors/StoreNodeVisitor';
import SubstringNodeVisitor from './visitors/SubstringNodeVisitor';
import UppercaseNodeVisitor from './visitors/UppercaseNodeVisitor';

/**
 * A visitor should be stateless; thus, visiting methods should be static.
 */
export default abstract class TransformationNodeVisitor
{
    public abstract visitDefault(node: TransformationNode, doc: object): TransformationVisitResult;

  public visitAppendNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
      return this.visitDefault(node, doc);
  }

    public visitDuplicateNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitFilterNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitGetNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitJoinNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitLoadNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitPlusNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitPrependNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitPutNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitSplitNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitStoreNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitSubstringNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }

    public visitUppercaseNode(node: TransformationNode, doc: object): TransformationVisitResult
    {
        return this.visitDefault(node, doc);
    }
}
