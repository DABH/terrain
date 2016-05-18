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

var Immutable = require('immutable');
import ActionTypes from './../../BuilderActionTypes.tsx';
import Util from './../../../../util/Util.tsx';
import { BuilderTypes } from './../../../BuilderTypes.tsx';

var SelectCardReducer = {};

SelectCardReducer[ActionTypes.cards.select.create] =
  Util.updateCardField('properties', (properties, action) => 
    properties.splice(
      Util.spliceIndex(action.payload.index, properties),
      0,
      
      Immutable.fromJS({
        property: "",
        id: "p" + Util.randInt(23496243),
      })));
    
SelectCardReducer[ActionTypes.cards.select.change] =
  Util.updateCardField('properties', (properties, action) => 
    properties.set(action.payload.index, Immutable.fromJS(action.payload.value)));

SelectCardReducer[ActionTypes.cards.select.move] =
  Util.updateCardField('properties', (properties, action) =>
    Util.immutableMove(properties, action.payload.property.id, action.payload.index));
    
SelectCardReducer[ActionTypes.cards.select.remove] =
    Util.updateCardField('properties', (properties, action) =>
      properties.remove(action.payload.index));


export default SelectCardReducer;