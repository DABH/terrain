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

// tslint:disable:restrict-plus-operands strict-boolean-expressions return-undefined no-console no-empty no-unused-expression

// Note: If anyone would like to take the time to clean up this file, be my guest.

import axios from 'axios';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';

import { recordForSave, responseToRecordConfig } from 'shared/util/Classes';
import { QueryRequest } from '../../../shared/database/types/QueryRequest';
import { MidwayError } from '../../../shared/error/MidwayError';
import BackendInstance from '../../database/types/BackendInstance';
import MidwayQueryResponse from '../../database/types/MidwayQueryResponse';
import { Item, ItemType } from '../../items/types/Item';
import Query from '../../items/types/Query';
import { AuthActions as Actions } from '../auth/data/AuthRedux';
import * as LibraryTypes from '../library/LibraryTypes';
import * as UserTypes from '../users/UserTypes';

import * as TerrainLog from 'loglevel';

import AjaxM1 from './AjaxM1';

export interface AjaxResponse
{
  promise: Promise<any>;
  cancel: (message?: string) => void;
}

export const Ajax =
  {
    reduxStoreDispatch: (action) => console.error('Ajax reduxStoreDispatch property has not been set.'),

    config: (config) =>
    {
      Ajax.reduxStoreDispatch = config.reduxStoreDispatch;
    },

    req(method: 'post' | 'get' | 'delete',
      url: string,
      body: object,
      onLoad: (response: object) => void,
      config: {
        noCredentials?: boolean,
        onError?: (response: any) => void,
        // crossDomain?: boolean;
        download?: boolean;
        downloadFilename?: string;
        urlArgs?: object;
      } = {})
    {
      let data: object;
      if (config.noCredentials)
      {
        data = body;
      }
      else
      {
        data = {
          id: localStorage['id'],
          accessToken: localStorage['accessToken'],
          body,
        };
      }
      return Ajax._reqGeneric(
        method,
        '/midway/v1/' + url,
        JSON.stringify(data),
        (response) =>
        {
          onLoad(response);
        },
        _.extend({
          onError: config.onError,
          noToken: true,
          json: true,
          crossDomain: false,
        }, config),
      );
    },

    _reqGeneric(method: string,
      url: string,
      data: string,
      onLoad: (response: any) => void,
      config: {
        onError?: (response: any) => void,
        host?: string,
        crossDomain?: boolean;
        noToken?: boolean;
        download?: boolean;
        downloadFilename?: string;
        json?: boolean;
        urlArgs?: object;
      } = {})
    {
      const host = config.host || '';
      const fullUrl = host + url;

      if (config.download)
      {
        const form = document.createElement('form');
        form.setAttribute('action', fullUrl);
        form.setAttribute('method', 'post');
        form.setAttribute('target', '_blank');

        // TODO move
        const accessToken = localStorage['accessToken'];
        const id = localStorage['id'];
        const dataObj = {
          id,
          accessToken,
          data,
          filename: config.downloadFilename,
        };
        _.map(dataObj as any, (value, key) =>
        {
          const input = document.createElement('input');
          input.setAttribute('type', 'hidden');
          input.setAttribute('name', key + '');
          input.setAttribute('value', value as any);
          form.appendChild(input);
        });

        document.body.appendChild(form); // Required for FF
        form.submit();
        form.remove();
        return;
      }

      const axiosInstance = axios.create();

      axiosInstance.interceptors.response.use(
        (response) => response,
        (error) =>
        {
          // This is an route error, we have to abstract the route error to an MidwayError object
          if (error && error.response)
          {
            if (error.response.status === 401)
            {
              Ajax.reduxStoreDispatch(Actions({ actionType: 'logout' }));
            }
          }
          const midwayError = MidwayError.fromAxiosErrorResponse(error, 'The Connection Has Been Lost.');
          return Promise.reject(midwayError);
        },
      );

      const headers = {};
      if (config.crossDomain)
      {
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Access-Control-Allow-Headers'] = 'Content-Type, \
          Access-Control-Allow-Headers, \
          Authorization, \
          X-Requested-With, \
          Access-Control-Allow-Origin';
      }

      const CancelToken = axios.CancelToken;
      const source = CancelToken.source();

      const xhr = axiosInstance.request({
        method,
        url: fullUrl,
        timeout: 180000,
        withCredentials: config.crossDomain,
        headers,
        params: method === 'get' ? Object.assign({}, JSON.parse(data), config.urlArgs) : {},
        data: method !== 'get' ? JSON.parse(data) : {},
        cancelToken: source.token,
      })
        .then((response) =>
        {
          onLoad(response.data);
        })
        .catch((err: MidwayError) =>
        {
          if (axios.isCancel(err))
          {
            // Added for testing, can be removed.
            TerrainLog.debug('isCanceled', err.getDetail());
          }
          // TODO: process this routeError via the Promise catch interface.
          // pass the error to the error handler if there is one.
          TerrainLog.debug('Midway Route Error: ' + err.getDetail());
          config && config.onError && config.onError(err);
        });

      return {
        promise: xhr,
        cancel: source.cancel,
      };
    },

    midwayStatus(success: () => void,
      failure: () => void)
    {
      return Ajax.req(
        'get',
        'status',
        {},
        (resp: { status: string }) =>
        {
          if (resp && resp.status === 'ok')
          {
            success();
          }
          else
          {
            failure();
          }
        },
        {
          onError: failure,
        },
      );
    },

    getUsers(onLoad: (users: { [id: string]: any }) => void)
    {
      return Ajax.req(
        'get',
        'users/',
        {},
        (response: object[]) =>
        {
          const usersObj = {};
          response.map(
            (user) =>
            {
              usersObj[user['id']] = responseToRecordConfig(user);
            },
          );
          onLoad(usersObj);
        },
      );
    },

    saveUser(user: UserTypes.User,
      onSave: (response: any) => void,
      onError: (response: any) => void)
    {
      const userData = recordForSave(user);

      return Ajax.req(
        'post',
        `users/${user.id}`,
        userData,
        onSave,
        {
          onError,
        },
      );
    },

    changePassword(id: number,
      oldPassword: string,
      newPassword: string,
      onSave: (response: any) => void,
      onError: (response: any) => void)
    {
      return Ajax.req(
        'post',
        `users/${id}`,
        {
          oldPassword,
          password: newPassword,
        },
        onSave,
        {
          onError,
        });
    },

    adminSaveUser(user: UserTypes.User)
    {
      return Ajax.req(
        'post',
        `users/${user.id}`,
        {
          isSuperUser: user.isSuperUser,
          isDisabled: user.isDisabled,
          email: user.email,
        },
        _.noop,
      );
    },

    createUser(name: string, email: string, password: string, onSave: (response: any) => void, onError: (response: any) => void)
    {
      return Ajax.req(
        'post',
        `users`,
        {
          name,
          email,
          password,
        },
        onSave,
        {
          onError,
        },
      );
    },
    getItems(onLoad: (categories: IMMap<number, LibraryTypes.Category>,
      groups: IMMap<number, LibraryTypes.Group>,
      algorithms: IMMap<number, LibraryTypes.Algorithm>,
      categoriesOrder: IMList<number, any>) => void,
      onError?: (ev: Event) => void)
    {
      return Ajax.req(
        'get',
        'items/',
        {},
        (items: object[]) =>
        {
          const mapping =
            {
              ALGORITHM: Immutable.Map<number, LibraryTypes.Algorithm>() as any,
              GROUP: Immutable.Map<number, LibraryTypes.Group>(),
              CATEGORY: Immutable.Map<number, LibraryTypes.Category>(),
              QUERY: Immutable.Map<number, Query>(),
            };
          const categoriesOrder = [];
          items.map(
            (itemObj) =>
            {
              const metaObj = JSON.parse(itemObj['meta']);
              if (itemObj['type'] === 'GROUP' && (!metaObj['modelVersion'] || metaObj['modelVersion'] < 3))
              {
                itemObj['type'] = 'CATEGORY';
              }
              if (itemObj['type'] === 'ALGORITHM' && (!metaObj['modelVersion'] || metaObj['modelVersion'] < 3))
              {
                itemObj['type'] = 'GROUP';
              }
              if (itemObj['type'] === 'VARIANT' && (!metaObj['modelVersion'] || metaObj['modelVersion'] < 3))
              {
                itemObj['type'] = 'ALGORITHM';
              }
              const item = LibraryTypes.typeToConstructor[itemObj['type']](
                responseToRecordConfig(itemObj),
              );
              mapping[item.type] = mapping[item.type].set(item.id, item);
              // Category or Group TODO TODO
              if (item.type === ItemType.Category)
              {
                categoriesOrder.push(item.id);
              }
            },
          );
          mapping.GROUP = mapping.GROUP.map(
            (cat) => cat.set('categoryId', cat.parent),
          ).toMap();
          mapping.ALGORITHM = mapping.ALGORITHM.map(
            (v) =>
            {
              v = v.set('groupId', v.parent);
              const alg = mapping.GROUP.get(v.groupId);
              if (alg)
              {
                v = v.set('categoryId', alg.categoryId);
              }
              return v;
            },
          ).toMap();

          onLoad(
            mapping.CATEGORY,
            mapping.GROUP,
            mapping.ALGORITHM,
            Immutable.List(categoriesOrder),
          );
        },
        {
          onError,
          urlArgs: {
            type: 'CATEGORY,ALGORITHM,VARIANT,GROUP', // Still have variant to retrieve old items
          },
        },
      );
    },

    getItem(type: ItemType,
      id: ID,
      onLoad: (item: Item) => void,
      onError?: (ev: Event) => void)
    {
      return Ajax.req(
        'get',
        `items/${id}`,
        {},
        (response: object[]) =>
        {
          if (response && response[0])
          {
            const itemObj = response[0];
            const metaObj = JSON.parse(itemObj['meta']);
            if (itemObj['type'] === 'GROUP' && (!metaObj['modelVersion'] || metaObj['modelVersion'] < 3))
            {
              itemObj['type'] = 'CATEGORY';
            }
            if (itemObj['type'] === 'ALGORITHM' && (!metaObj['modelVersion'] || metaObj['modelVersion'] < 3))
            {
              itemObj['type'] = 'GROUP';
            }
            if (itemObj['type'] === 'VARIANT' && (!metaObj['modelVersion'] || metaObj['modelVersion'] < 3))
            {
              itemObj['type'] = 'ALGORITHM';
            }
            const item = LibraryTypes.typeToConstructor[itemObj['type']](responseToRecordConfig(itemObj));
            onLoad(item);
          }
          else
          {
            onError && onError('Nothing found' as any);
          }
        },
        {
          onError,
        });
    },

    getAlgorithm(algorithmId: ID,
      onLoad: (algorithm: LibraryTypes.Algorithm) => void)
    {
      return Ajax.getItem(
        'ALGORITHM',
        algorithmId,
        (algorithmItem: Item) =>
        {
          onLoad(algorithmItem as LibraryTypes.Algorithm);
        },
        (error) =>
        {
          if (error as any === 'Nothing found')
          {
            onLoad(null);
          }
        },
      );
      // }
      // TODO
      // if (algorithmId.indexOf('@') === -1)
      // {
      // else
      // {
      //   // TODO
      //   // return Ajax.getAlgorithmVersion(
      //   //   algorithmId,
      //   //   onLoad,
      //   // );
      // }
    },

    getAlgorithmStatus(
      algorithmId: ID,
      dbid: number,
      deployedName: string,
      onLoad: (resp: object) => void,
      onError?: (resp: any) => void,
    )
    {
      const onLoadHandler = (resp) =>
      {
        onLoad(resp);
      };
      Ajax.req(
        'get',
        'items/live/' + algorithmId,
        {},
        (response: object) =>
        {
          let responseData: object;
          try
          {
            responseData = response;
          }
          catch (e)
          {
            onError && onError(e.message);
          }

          if (responseData !== undefined)
          {
            // needs to be outside of the try/catch so that any errors it throws aren't caught
            onLoad(responseData);
          }
        },
        {
          onError, urlArgs: { dbid, deployedName },
        },
      );
      return;
    },

    getVersions(id: ID, onLoad: (versions: any) => void, onError?: (ev: Event) => void)
    {
      return Ajax.req('get', 'versions/items/' + id, {}, (response: any) =>
      {
        try
        {
          onLoad(response);
        }
        catch (e)
        {
          onError && onError(response as any);
        }
      });
    },

    getVersion(id: ID, onLoad: (version: any) => void)
    {
      // TODO
      onLoad(null);
      return null;

      // if (!id || id.indexOf('@') === -1)
      // {
      //   onLoad(null);
      //   return null;
      // }

      // // viewing an old version
      // const pieces = id.split('@');
      // const originalId = pieces[0];
      // const versionId = pieces[1];

      // const url = '/versions/' + originalId;
      // return Ajax._get(
      //   url,
      //   '',
      //   (response: any) =>
      //   {
      //     const version = JSON.parse(response).find((version) => version.id === versionId);
      //     if (version)
      //     {
      //       const data = JSON.parse(version.data);
      //       Ajax.getAlgorithm(originalId, (v: LibraryTypes.Algorithm) =>
      //       {
      //         if (v)
      //         {
      //           data['id'] = v.id;
      //           data['createdByUserId'] = v.createdByUserId;
      //           data['object'] = v['object'];
      //           data['objectId'] = v.objectId;
      //           data['objectType'] = v.objectType;

      //           onLoad(LibraryTypes._Algorithm(data));
      //         }
      //         else
      //         {
      //           onLoad(null);
      //         }
      //       });
      //     }
      //     else
      //     {
      //       onLoad(null);
      //     }
      //   },
      //   () => onLoad(null),
      // );
    },

    getQuery(algorithmId: ID,
      onLoad: (query: Query, algorithm: LibraryTypes.Algorithm) => void)
    {
      if (!algorithmId)
      {
        return;
      }

      // TODO change if we store queries separate from algorithms
      return Ajax.getAlgorithm(
        algorithmId,
        (v: LibraryTypes.Algorithm) =>
        {
          if (!v || !v.query)
          {
            onLoad(null, v);
          }
          else
          {
            onLoad(v.query, v);
          }
        },
      );
    },

    saveItem(item: Item,
      onLoad?: (resp: any) => void, onError?: (ev: Event) => void)
    {
      if (item.type === ItemType.Algorithm)
      {
        item = LibraryTypes.algorithmForSave(item as LibraryTypes.Algorithm);
      }
      const itemData = recordForSave(item);
      const id = itemData['id'];
      let route = `items/${id}`;
      if (id === -1)
      {
        delete itemData['id'];
        route = 'items';
      }
      onLoad = onLoad || _.noop;

      return Ajax.req(
        'post',
        route,
        itemData,
        (respArray) =>
        {
          onLoad(respArray[0]);
        },
        {
          onError,
        },
      );
    },

    deleteItem(item: Item,
      onLoad?: (resp: any) => void, onError?: (ev: Event) => void)
    {
      const id = item.id;
      const route = `items/${id}`;
      onLoad = onLoad || _.noop;

      return Ajax.req(
        'delete',
        route,
        null,
        (respArray) =>
        {
          onLoad(respArray[0]);
        },
        {
          onError,
        },
      );
    },

    /**
     * Query M2
     */
    query(body: string,
      db: BackendInstance,
      onLoad: (response: MidwayQueryResponse) => void,
      onError?: (ev: string | MidwayError) => void,
      sqlQuery?: boolean, // unused
      options: {
        streaming?: boolean,
        streamingTo?: string,
      } = {},
    ): { xhr: AjaxResponse, queryId: string }
    {
      const payload: QueryRequest = {
        type: 'search', // can be other things in the future
        database: db.id as number, // should be passed by caller
        streaming: options.streaming,
        body,
      };

      const onLoadHandler = (resp) =>
      {
        const queryResult: MidwayQueryResponse = MidwayQueryResponse.fromParsedJsonObject(resp);
        onLoad(queryResult);
      };
      const queryId = '' + Math.random();
      const xhr = Ajax.req(
        'post',
        'query/',
        payload,
        onLoadHandler,
        {
          onError,
          download: options.streaming,
          downloadFilename: options.streamingTo,
        },
      );

      return { queryId, xhr };
    },

    deployQuery(
      type: string,
      body: object,
      db: BackendInstance,
      onLoad: (response: MidwayQueryResponse) => void,
      onError?: (ev: string | MidwayError) => void,
    )
    {
      const payload: QueryRequest = {
        type,
        database: db.id as number,
        body,
      };

      const onLoadHandler = (resp) =>
      {
        const queryResult: MidwayQueryResponse = MidwayQueryResponse.fromParsedJsonObject(resp);
        onLoad(queryResult);
      };

      Ajax.req(
        'post',
        'query/',
        payload,
        onLoadHandler,
        {
          onError,
        },
      );
    },

    starColumn(
      columnId: ID,
      starred: boolean,
      id?: number,
      onLoad?: (resp) => void,
      onError?: (error) => void)
    {
      const body = id !== undefined ? { columnId, starred, id } : { columnId, starred, id };
      return Ajax.req('post', 'schemametadata/star', body, (resp: any) =>
      {
        try
        {
          onLoad && onLoad(resp);
        }
        catch (e)
        {
          onError && onError(e);
        }
      });
    },

    schemaMetadata(id?: number, onLoad?: (resp) => void, onError?: (error) => void)
    {
      return Ajax.req('get', 'schemametadata/', { id }, (resp: any) =>
      {
        try
        {
          onLoad && onLoad(resp);
        }
        catch (e)
        {
          onError && onError(e);
        }
      });
    },

    countColumn(
      columnId: ID,
      algorithmId?: string | number,
      id?: number,
      onLoad?: (resp) => void,
      onError?: (error) => void)
    {
      const body = id === undefined ? { columnId, algorithmId } : { columnId, algorithmId, id };
      return Ajax.req('post', 'schemametadata/count', body, (resp: any) =>
      {
        try
        {
          onLoad && onLoad(resp);
        }
        catch (e)
        {
          onError && onError(e);
        }
      });
    },

    getResultsConfig(
      index: string,
      onLoad?: (resp) => void,
      onError?: (error) => void,
    )
    {
      return Ajax.req('post', 'resultsconfig/', { index }, (resp: any) =>
      {
        try
        {
          onLoad && onLoad(JSON.parse(JSON.stringify(resp)));
        }
        catch (e)
        {
          onError && onError(e);
        }
      });
    },

    updateResultsConfig(
      index: string,
      resultsConfig: any,
      onLoad?: (resp) => void,
      onError?: (error) => void,
    )
    {
      const body = { resultsConfig, index };
      return Ajax.req('post', 'resultsconfig/update', body, (resp: any) =>
      {
        try
        {
          onLoad && onLoad(resp);
        }
        catch (e)
        {
          onError && onError(e);
        }
      });
    },

    runOnDemandSchedule(
      id: ID,
      onLoad: (resp: object[]) => void,
      onError?: (ev: string) => void,
    )
    {
      const payload = {};

      return Ajax.req(
        'post',
        'scheduler/run/' + String(id),
        payload,
        (response: object[]) =>
        {
          onLoad(response);
        },
        {
          onError,
        },
      );
    },

    schema(dbId: number | string, onLoad: (columns: object | any[], error?: any) => void, onError?: (ev: Event) => void)
    {
      // TODO see if needs to query m1
      return Ajax.req('get', 'database/' + dbId + '/schema', {}, (response: any) =>
      {
        try
        {
          const cols: object = typeof response === 'string' ? JSON.parse(response) : response;
          onLoad(cols);
        }
        catch (e)
        {
          onError && onError(response as any);
        }
      });
    },

    getDbs(onLoad: (dbs: BackendInstance[], loadFinished: boolean) => void, onError?: (ev: Event) => void)
    {
      let m2Dbs: BackendInstance[] = null;
      const checkForLoaded = () =>
      {
        if (!m2Dbs)
        {
          return;
        }

        let dbs: BackendInstance[] = [];
        if (m2Dbs)
        {
          dbs = dbs.concat(m2Dbs);
        }
        onLoad(dbs, !!(m2Dbs));
      };

      Ajax.req(
        'get',
        'database',
        {},
        (dbs: [BackendInstance]) =>
        {
          m2Dbs = dbs.map((db) =>
          {
            db['source'] = 'm2';
            return db;
          });
          checkForLoaded();
        },
        {
          onError: (e) =>
          {
            onError && onError(e);
            m2Dbs = [] as any;
            checkForLoaded();
          },
        },
      );
    },

    createDb(name: string, dsn: string, type: string,
      isAnalytics: boolean, analyticsIndex: string, analyticsType: string,
      onSave: (response: any) => void,
      onError: (response: any) => void)
    {
      return Ajax.req(
        'post',
        `database`,
        {
          name,
          dsn,
          host: dsn,
          type,
          isAnalytics,
          analyticsIndex,
          analyticsType,
        },
        onSave,
        {
          onError,
        },
      );
    },

    deleteDb(id: number,
      onSave: (response: any) => void,
      onError: (response: any) => void)
    {
      return Ajax.req(
        'post',
        `database/` + id + `/delete`,
        {},
        onSave,
        {
          onError,
        },
      );
    },

    login(email: string,
      password: string,
      onLoad: (data: {
        id: number,
        accessToken: string,
      }) => void,
      onError: (error) => void): any
    {
      return Ajax.req(
        'post',
        'auth/login',
        {
          email,
          password,
        },
        onLoad,
        {
          onError,
          noCredentials: true,
        },
      );
    },

    logout(accessToken: string, id: number)
    {
      return Ajax.req(
        'post',
        'auth/logout',
        {
          accessToken,
          id,
        },
        () =>
        {
          // successfully logged out, reload the page
          location.reload();
        },
        {
          noCredentials: true,
        },
      );
    },

    getAnalytics(
      connectionId: number,
      algorithmIds: ID[],
      start: Date,
      end: Date,
      metric: string,
      intervalId: number,
      aggregation: string,
      onLoad: (response: any) => void,
      onError?: (error: any) => void)
    {
      const args = {
        algorithmid: algorithmIds.join(','),
        start,
        end,
        eventname: metric,
        interval: intervalId,
        agg: aggregation,
        field: 'timestamp',
        database: connectionId,
      };

      return Ajax.req(
        'get',
        `events/agg`,
        {},
        (response: any) =>
        {
          try
          {
            onLoad(response);
          }
          catch (e)
          {
            onError && onError(JSON.parse(response) as any);
          }
        },
        { onError, urlArgs: args });
    },

    getServerTime(
      onLoad: (response: any) => void,
      onError?: (ev: Event) => void,
    )
    {
      return Ajax.req(
        'get',
        'time',
        {},
        (response: any) =>
        {
          try
          {
            onLoad(response);
          }
          catch (e)
          {
            onError && onError(response as any);
          }
        },
        { onError });
    },

    getAvailableMetrics(
      onLoad: (response: any) => void,
      onError?: (ev: Event) => void,
    )
    {
      return Ajax.req(
        'get',
        'events/metrics',
        {},
        (response: any) =>
        {
          try
          {
            onLoad(response);
          }
          catch (e)
          {
            onError && onError(response as any);
          }
        },
        { onError });
    },

    getLogs(
      onLoad: (response: any) => void,
      onError?: (ev: Event) => void,
    )
    {
      return Ajax.req(
        'get',
        'status/logs',
        {},
        (response: any) =>
        {
          try
          {
            onLoad(response);
          }
          catch (e)
          {
            onError && onError(response as any);
          }
        },
        { onError });
    },

    // not to be confused with deleteDb, which actually deletes a server connection
    deleteDatabase(
      dbid: number,
      dbname: string,
      language: string,
    ): Promise<any>
    {
      return new Promise<any>((resolve, reject) =>
      {
        return Ajax.req(
          'post',
          'schema/database/delete',
          {
            dbid,
            dbname,
            language,
          },
          resolve,
          {
            onError: reject,
          },
        );
      });
    },
  };

export default Ajax;
