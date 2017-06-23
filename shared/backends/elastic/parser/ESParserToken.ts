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

import ESParserError from './ESParserError';
import ESValueInfo from './ESValueInfo';

/**
 * Represents a token generated by the ESJSONParser
 */
export default class ESParserToken
{
  private static emptyErrorList: ESParserError[] = [];

  public charNumber: number; // number of chars into the source that this token begins
  public row: number; // row in which this token begins (rows start at 0)
  public col: number; // column in which this token begins (cols start at 0)
  public length: number; // token length in chars
  public substring: string; // token substring

  public valueInfo: ESValueInfo | null; // value info that this token belongs to

  public errors: ESParserError[];

  public constructor(charNumber: number,
    row: number,
    col: number,
    length: number,
    substring: string)
  {
    this.charNumber = charNumber;
    this.row = row;
    this.col = col;
    this.length = length;
    this.substring = substring;
    this.valueInfo = null;
    this.errors = ESParserToken.emptyErrorList;
  }

  public attachError(error: ESParserError): void
  {
    if (this.valueInfo !== null)
    {
      this.valueInfo.attachError(error);
    }

    if (this.errors.length === 0)
    {
      this.errors = [error];
    }
    else
    {
      this.errors.push(error);
    }
  }
}
