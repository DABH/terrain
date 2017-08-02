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

// tslint:disable:restrict-plus-operands max-line-length

import * as Immutable from 'immutable';
import * as _ from 'underscore';
const { List, Map } = Immutable;
const L = () => List([]);
import * as CommonElastic from '../../../../shared/database/elastic/syntax/CommonElastic';
import * as BlockUtils from '../../../blocks/BlockUtils';
import * as CommonBlocks from '../../../blocks/CommonBlocks';
import { Display, DisplayType, firstSecondDisplay, getCardStringDisplay, letVarDisplay, stringValueDisplay, valueDisplay, wrapperDisplay, wrapperSingleChildDisplay } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card, Card, CardString } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;

import TransformCard from '../../../app/builder/components/charts/TransformCard';
import { AutocompleteMatchType, ElasticBlockHelpers } from './ElasticBlockHelpers';

const transformScoreInputTypes = CommonElastic.acceptsValues;

export const scorePoint = _block(
  {
    value: 0,
    score: 0,

    static: {
      language: 'elastic',
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        return [block['value'], block['score']];
      },
    },
  });

export const elasticTransform = _card(
  {
    input: '',
    scorePoints: List([]),

    domain: List([0, 100]),
    hasCustomDomain: false, // has the user set a custom domain

    noTitle: true,

    static: {
      language: 'elastic',
      // manualEntry: ManualConfig.cards['transform'],
      colors: ['#4b979a', 'rgba(75, 153, 154, 0.7)'],
      title: 'Transform',
      preview: (card: any) =>
      {
        if (card.input._isCard)
        {
          return '' + BlockUtils.getPreview(card.input);
        }
        return '' + card.input;
      },
      display: [
        {
          displayType: DisplayType.TEXT,
          // help: ManualConfig.help['input'],
          key: 'input',
          placeholder: 'Input field',
          accepts: transformScoreInputTypes,
          showWhenCards: true,
          getAutoTerms: (schemaState): List<string> =>
          {
            return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Field);
          },
        },
        // TODO, in the future, if we allow complicated formulas inside
        //  transforms, then we can change this back to a cards view
        // {
        //   displayType: DisplayType.CARDSFORTEXT,
        //   key: 'input',
        //   accepts: transformScoreInputTypes,
        // },
        {
          displayType: DisplayType.COMPONENT,
          component: TransformCard,
          requiresBuilderState: true,
          key: null,
          // help: ManualConfig.help['scorePoints'],
        },
      ],

      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        return {
          a: 0,
          b: 1,
          numerators: [[block['input'], 1]],
          denominators: [],
          ranges: block['scorePoints'].map((scorePt) => scorePt.value).toArray(),
          outputs: block['scorePoints'].map((scorePt) => scorePt.score).toArray(),
        };
      },

      init: (blocksConfig) => (
        {
          scorePoints: List([
            BlockUtils.make(blocksConfig, 'scorePoint', {
              value: 2,
              score: 0.2,
            }),
            BlockUtils.make(blocksConfig, 'scorePoint', {
              value: 15,
              score: 0.5,
            }),
          ]),
        }
      ),

      metaFields: ['domain', 'hasCustomDomain'],
    },
  });

export default elasticTransform;
