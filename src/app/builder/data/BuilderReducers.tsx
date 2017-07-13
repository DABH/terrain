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

import * as Immutable from 'immutable';
import * as _ from 'underscore';
import { AllBackendsMap } from '../../../../shared/backends/AllBackends';
import BackendInstance from '../../../../shared/backends/types/BackendInstance';
import * as BlockUtils from '../../../../shared/blocks/BlockUtils';
import Query from '../../../../shared/items/types/Query';
import Util from '../../util/Util';
import Ajax from './../../util/Ajax';
import AjaxM1 from './../../util/AjaxM1';
import Actions from './BuilderActions';
import ActionTypes from './BuilderActionTypes';
import { BuilderState } from './BuilderStore';

const BuidlerReducers: ReduxActions.ReducerMap<BuilderState, any> =
  {

    [ActionTypes.fetchQuery]:
    (
      state: BuilderState,
      action: {
        payload?: {
          variantId: ID,
          handleNoVariant: (id: ID) => void,
          db: BackendInstance,
        },
      },
    ) =>
    {
      const { variantId, handleNoVariant } = action.payload;

      if (state.loadingXhr)
      {
        if (variantId === state.loadingVariantId)
        {
          // still loading the same variant
          return state;
        }

        // abort the previous request
        state.loadingXhr.abort();
      }

      const xhr: XMLHttpRequest = Ajax.getQuery(
        variantId,
        (query: Query) =>
        {
          if (query)
          {
            Actions.queryLoaded(query, xhr, action.payload.db);
          }
          else
          {
            handleNoVariant &&
              handleNoVariant(variantId);
          }
        },
      );

      return state
        .set('loading', true)
        .set('loadingXhr', xhr)
        .set('loadingVariantId', variantId)
        ;
    },

    [ActionTypes.queryLoaded]:
    (
      state: BuilderState,
      action: Action<{
        query: Query,
        xhr: XMLHttpRequest,
        db: BackendInstance,
      }>,
    ) =>
    {
      let { query } = action.payload;
      if (state.loadingXhr !== action.payload.xhr)
      {
        // wrong XHR
        return state;
      }

      if (action.payload.query.tql)
      {
        query = query.set('parseTree', AllBackendsMap[query.language].parseQuery(action.payload.query.tql));
      } else
      {
        query = query.set('parseTree', null);
      }

      if (!action.payload.query.cardsAndCodeInSync)
      {
        if (action.payload.query.tql)
        {
          query = AllBackendsMap[query.language].codeToQuery(
            query,
            Actions.changeQuery,
          );
        }
        else
        {
          // blank
          query = query
            .set('cardsAndCodeInSync', true);
        }
      }

      return state
        .set('query', query)
        .set('loading', false)
        .set('loadingXhr', null)
        .set('loadingVariantId', '')
        .set('isDirty', false)
        .set('pastQueries', Immutable.List([]))
        .set('nextQueries', Immutable.List([]))
        .set('db', action.payload.db)
        ;
    },

    [ActionTypes.change]:
    (
      state: BuilderState,
      action: {
        payload?: {
          keyPath: KeyPath,
          value: any,
        },
      },
    ) =>
      state.setIn(
        action.payload.keyPath,
        action.payload.value,
      ),

    [ActionTypes.changeQuery]:
    (
      state: BuilderState,
      action: {
        payload?: {
          query: Query,
        },
      },
    ) =>
      state.set('query', action.payload.query),

    [ActionTypes.create]:
    (
      state: BuilderState,
      action: {
        payload?: {
          keyPath: KeyPath,
          index: number,
          factoryType: string,
          data: any,
        },
      },
    ) =>
      state.updateIn(
        action.payload.keyPath,
        (arr) =>
        {
          const item = action.payload.data ? action.payload.data :
            BlockUtils.make(
              AllBackendsMap[state.query.language].blocks[action.payload.factoryType],
            );

          if (action.payload.index === null)
          {
            return item; // creating at that spot
          }

          return arr.splice
            (
            action.payload.index === undefined || action.payload.index === -1 ? arr.size : action.payload.index,
            0,
            item,
          );
        },
      )
    ,

    [ActionTypes.move]:
    (
      state: BuilderState,
      action: {
        payload?: {
          keyPath: KeyPath,
          index: number,
          newIndex; number
        },
      },
    ) =>
      state.updateIn(
        action.payload.keyPath,
        (arr) =>
        {
          const { index, newIndex } = action.payload;
          const el = arr.get(index);
          arr = arr.splice(index, 1);
          arr = arr.splice(newIndex, 0, el); // TODO potentially correct index
          return arr;
        },
      ),

    // first check original keypath
    [ActionTypes.nestedMove]: // a deep move
    (state: BuilderState, action: {
      payload?: { itemKeyPath: KeyPath, itemIndex: number, newKeyPath: KeyPath, newIndex: number },
    }) =>
    {
      const { itemKeyPath, itemIndex, newKeyPath, newIndex } = action.payload;

      if (itemKeyPath.equals(newKeyPath))
      {
        if (itemIndex === newIndex)
        {
          return state;
        }

        // moving within same list
        return state.updateIn(itemKeyPath, (arr) =>
        {
          const item = arr.get(itemIndex);
          let indexOffset = 0;
          if (itemIndex < newIndex)
          {
            // dragging down
            indexOffset = -1;
          }
          return arr.splice(itemIndex, 1).splice(newIndex + indexOffset, 0, item);
        });
      }

      const itemReferenceKeyPath = itemIndex === null ? itemKeyPath : itemKeyPath.push(itemIndex);
      const item = state.getIn(itemReferenceKeyPath);
      const tempId = '' + Math.random(); // mark with a temporary ID so we know where to delete
      state = state.setIn(itemReferenceKeyPath.push('id'), tempId);

      state = state.updateIn(newKeyPath, (obj) =>
      {
        if (Immutable.List.isList(obj))
        {
          return obj.splice(newIndex, 0, item);
        }
        return item;
      });

      if (state.getIn(itemReferenceKeyPath.push('id')) === tempId)
      {
        // location remained same, optimized delete
        state = state.deleteIn(itemReferenceKeyPath);
      }
      else
      {
        // search and destroy
        // NOTE: if in the future the same card is open in multiple places, this will break
        state = state.deleteIn(Util.keyPathForId(state, tempId) as Array<string | number>);
        // Consider an optimized search if performance becomes an issue.
      }

      state = trimParent(state, itemKeyPath);

      return state;
    },

    [ActionTypes.remove]:
    (state: BuilderState, action: {
      payload?: { keyPath: KeyPath, index: number },
    }) =>
    {
      let { keyPath, index } = action.payload;
      if (index !== null)
      {
        keyPath = keyPath.push(index);
      }

      state = state.removeIn(keyPath);
      state = trimParent(state, keyPath);

      return state;
    },

    // change handwritten tql
    [ActionTypes.changeTQL]:
    (
      state: BuilderState,
      action: Action<{
        tql: string,
      }>,
    ) =>
    {
      // TODO MOD convert
      let { query } = state;
      const tql: string = action.payload.tql;
      query = query.set('lastMutation', query.lastMutation + 1).set('tql', tql)
        .set('parseTree', AllBackendsMap[query.language].parseQuery(tql));
      query = AllBackendsMap[query.language].codeToQuery(
        query,
        Actions.changeQuery,
      );
      state = state.set('query', query);
      return state;
    },

    [ActionTypes.hoverCard]:
    (state: BuilderState, action: Action<{
      cardId: ID,
    }>) =>
      state.set('hoveringCardId', action.payload.cardId),
    // if hovered over same card, will return original state object

    [ActionTypes.selectCard]:
    (state: BuilderState, action: Action<{
      cardId: ID,
      shiftKey: boolean,
      ctrlKey: boolean,
    }>) =>
    {
      const { cardId, shiftKey, ctrlKey } = action.payload;
      if (!shiftKey && !ctrlKey)
      {
        state = state.set('selectedCardIds', Immutable.Map({}));
      }
      if (ctrlKey)
      {
        return state.setIn(['selectedCardIds', cardId],
          !state.getIn(['selectedCardIds', cardId]));
      }
      return state.setIn(['selectedCardIds', cardId], true);
    },

    [ActionTypes.dragCard]:
    (
      state: BuilderState,
      action: Action<{
        cardItem: any,
      }>,
    ) =>
      state.set('draggingCardItem', action.payload.cardItem),

    [ActionTypes.dragCardOver]:
    (state: BuilderState, action: {
      payload?: { keyPath: KeyPath, index: number },
    }) =>
    {
      const { keyPath, index } = action.payload;
      return state
        .set('draggingOverKeyPath', keyPath)
        .set('draggingOverIndex', index);
    },

    [ActionTypes.dropCard]:
    (state) => state
      .set('draggingOverKeyPath', null)
      .set('draggingOverIndex', null)
      .set('draggingCardItem', null),

    [ActionTypes.toggleDeck]:
    (state: BuilderState, action) => state
      .setIn(['query', 'deckOpen'], action.payload.open),

    [ActionTypes.changeResultsConfig]:
    (
      state: BuilderState,
      action: Action<{
        resultsConfig: any,
      }>,
    ) =>
      state
        .update('query',
        (query) =>
          query.set('resultsConfig', action.payload.resultsConfig),
      ),

    [ActionTypes.save]:
    (
      state: BuilderState,
      action: Action<{
        failed?: boolean,
      }>,
    ) =>
      state
        .set('isDirty', action.payload && action.payload.failed),

    [ActionTypes.undo]:
    (
      state: BuilderState,
      action: Action<{}>,
    ) =>
    {
      if (state.pastQueries.size)
      {
        const pastQuery = state.pastQueries.get(0);
        const pastQueries = state.pastQueries.shift();
        const nextQueries = state.nextQueries.unshift(state.query);
        return state
          .set('pastQueries', pastQueries)
          .set('query', pastQuery)
          .set('nextQueries', nextQueries);
      }
      return state;
    },

    [ActionTypes.redo]:
    (
      state: BuilderState,
      action: Action<{}>,
    ) =>
    {
      if (state.nextQueries.size)
      {
        const nextQuery = state.nextQueries.get(0);
        const nextQueries = state.nextQueries.shift();
        const pastQueries = state.pastQueries.unshift(state.query);
        return state
          .set('pastQueries', pastQueries)
          .set('query', nextQuery)
          .set('nextQueries', nextQueries);
      }
      return state;
    },

    [ActionTypes.checkpoint]:
    (state: BuilderState, action: Action<{}>) => state,

    [ActionTypes.results]:
    (
      state: BuilderState,
      action: Action<{ resultsState }>,
    ) =>
      state.set('resultsState', action.payload.resultsState),
  };

function trimParent(state: BuilderState, keyPath: KeyPath): BuilderState
{
  const parentKeyPath = keyPath.splice(keyPath.size - 1, 1).toList();
  const parentListKeyPath = parentKeyPath.splice(parentKeyPath.size - 1, 1).toList();
  const st = state.getIn(parentKeyPath.push('static'));

  if (st && st.removeOnCardRemove
    && state.getIn(parentListKeyPath).size > 1 // only remove if there are multiple items
  )
  {
    return state.removeIn(parentKeyPath);
  }

  return state;
}

Util.assertKeysArePresent(ActionTypes, BuidlerReducers, 'Missing Builder Reducer for Builder Action Types: ');

export default BuidlerReducers;
