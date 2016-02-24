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

var _ = require('underscore');
var Immutable = require('immutable');

/*

Terminology:
- create
- change
- move
- remove

*/

// These are  commonly used type words. Defining them as variables here
//  allows us to use ES6 short-hand in our ActionTypes object.
var move = '';
var create = '';
var remove = '';
var change = '';

// Defining our object like this gives us compile-time TypeScript support for ActionTypes
//  and prevents us from defining duplicate action types.
// The keys are the action types.
// The values are initially the empty string (for coding expediency) but a function at the end
//  of this file sets all of the values equal to the keys.
// So you end up with ActionTypes.cards.move === 'cards.move'

var ActionTypes = 
{
  cards:
  {
    move,
    create,
    remove,
    
    from:
    {
      changeGroup: '',
      
      join:
      {
        create,
        change,
        remove,
      }
    },

    select: {
    	create,
      change,
      move,
      remove,
    },

    sort:
    {
    	change,
    },

    filter:
    {
      create,
      change,
      remove,
    },

    let:
    {
      change,
    },

    score:
    {
      change,
      create,
      changeWeights: '',
    },

    transform:
    {
      change,
      scorePoint: '',
    }
    
  },

  inputs:
  {
    create,
    changeKey: '',
    changeValue: '',
    changeType: '',
    move,
    remove,
  },

  results:
  {
    move,
    spotlight: '',
    pin: '',
  },

  newAlgorithm: '',
  closeAlgorithm: '',
};

// I tried using this type to correclty classify this function,
//  but because of how object literals work in TypeScript,
//  it wasn't useful.
// Reference: http://stackoverflow.com/questions/22077023/why-cant-i-indirectly-return-an-object-literal-to-satisfy-an-index-signature-re
// type ObjectOfStrings = { [s: string]: ObjectOfStrings | string };

var setValuesToKeys = (obj: any, prefix: string) =>
{
  prefix = prefix + (prefix.length > 0 ? '.' : '');
  for(var key in obj)
  {
    var value = prefix + key;
    if(typeof obj[key] === 'string')
    {
      obj[key] = value;
    }
    else if(typeof obj[key] === 'object')
    {
      setValuesToKeys(obj[key], value);
    }
    else
    {
      throw "Value found in ActionTypes that is neither string or object of strings: key: " + key + ", value: " + obj[key];
    }
  }
}

setValuesToKeys(ActionTypes, '');

export default ActionTypes;