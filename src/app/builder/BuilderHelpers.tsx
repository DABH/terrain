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

// tslint:disable:strict-boolean-expressions

import { Block } from '../../../shared/blocks/types/Block';
import { Card } from '../../../shared/blocks/types/Card';
import { Input } from '../../../shared/blocks/types/Input';

import * as Immutable from 'immutable';
import SchemaStore from '../schema/data/SchemaStore';
import { BuilderState, BuilderStore } from './data/BuilderStore';

export function getTermsForKeyPath(keyPath: KeyPath): List<string>
{
  const state = BuilderStore.getState();

  const terms = getTermsForKeyPathHelper(keyPath, state);

  // TODO migrate inputs reduction to the Query class if we get a query class
  const inputs = state.query && state.query.inputs;
  if (inputs && inputs.size)
  {
    const inputTerms = inputs.map(
      (input: Input) => 'input.' + input.key,
    ).toList();
    if (terms)
    {
      return inputTerms.concat(terms).toList();
    }
    return inputTerms;
  }

  return terms;
}

function getTermsForKeyPathHelper(keyPath: KeyPath, state: BuilderState): List<string>
{
  if (!keyPath.size)
  {
    return Immutable.List([]);
  }

  let terms = getTermsForKeyPathHelper(keyPath.butLast() as KeyPath, state);

  const block = BuilderStore.getState().getIn(keyPath);

  if (block._isCard)
  {
    const card = block as Card;

    if (card.static.getChildTerms)
    {
      terms = terms.concat(card.static.getChildTerms(card, SchemaStore.getState())).toList();
    }

    if (card.static.getNeighborTerms)
    {
      terms = terms.concat(card.static.getNeighborTerms(card, SchemaStore.getState())).toList();
    }

    if (card['cards'])
    {
      card['cards'].map(
        (childCard: Card) =>
        {
          if (childCard.static.getParentTerms)
          {
            terms = terms.concat(childCard.static.getParentTerms(childCard, SchemaStore.getState())).toList();
          }
        },
      );
    }
  }

  return terms;
}
