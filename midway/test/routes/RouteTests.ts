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

import * as fs from 'fs';
import * as request from 'supertest';
import { promisify } from 'util';
import * as winston from 'winston';

import { App, DB } from '../../src/app/App';
import ElasticConfig from '../../src/database/elastic/ElasticConfig';
import ElasticController from '../../src/database/elastic/ElasticController';
import ElasticDB from '../../src/database/elastic/tasty/ElasticDB';
import * as Tasty from '../../src/tasty/Tasty';

let elasticDB: ElasticDB;
let server;

let defaultUserAccessToken: string = '';
const exportTemplateID: number = -1;
const persistentExportAccessToken: string = '';

let templateId: number = -1; // ETL

const mySQLImportTemplateID: number = -1;
const persistentImportMySQLAccessToken: string = '';

let schedulerExportId = '';

// tslint:disable:max-line-length

beforeAll(async (done) =>
{
  try
  {
    const options =
      {
        debug: true,
        db: 'postgres',
        dsn: 't3rr41n-demo:r3curs1v3$@127.0.0.1:65432/moviesdb',
        port: 63000,
        databases: [
          {
            name: 'My ElasticSearch Instance',
            type: 'elastic',
            dsn: 'http://127.0.0.1:9200',
            host: 'http://127.0.0.1:9200',
            isAnalytics: true,
            analyticsIndex: 'terrain-analytics',
            analyticsType: 'events',
          },
          {
            name: 'MySQL Test Connection',
            type: 'mysql',
            dsn: 't3rr41n-demo:r3curs1v3$@127.0.0.1:63306/moviesdb',
            host: '127.0.0.1:63306',
            isAnalytics: false,
          },
        ],
      };

    const app = new App(options);
    server = await app.start();

    const config: ElasticConfig = {
      hosts: ['http://localhost:9200'],
    };

    const elasticController: ElasticController = new ElasticController(config, 0, 'RouteTests');
    elasticDB = elasticController.getTasty().getDB() as ElasticDB;

    const items = [
      {
        meta: 'I won a Nobel prize! But Im more proud of my music',
        name: 'Al Gore',
        parent: 0,
        status: 'Still Alive',
        type: 'GROUP',
      },
      {
        meta: '#realmusician',
        name: 'Updated Item',
        parent: 0,
        status: 'LIVE',
        type: 'CATEGORY',
      },
      {
        meta: 'Are we an item?',
        name: 'Justin Bieber',
        parent: 0,
        status: 'Baby',
        type: 'ALGORITHM',
      },
    ];
    const itemTable = new Tasty.Table(
      'items',
      ['id'],
      [
        'meta',
        'name',
        'parent',
        'status',
        'type',
      ],
    );
    await DB.getDB().execute(
      DB.getDB().generate(new Tasty.Query(itemTable).upsert(items)),
    );

    const versions = [
      {
        objectType: 'items',
        objectId: 2,
        object: '{"id":2,"meta":"#realmusician","name":"Updated Item","parent":0,"status":"LIVE","type":"CATEGORY"}',
        createdAt: '2017-05-31 00:22:04',
        createdByUserId: 1,
      },
    ];
    const versionTable = new Tasty.Table(
      'versions',
      ['id'],
      [
        'createdAt',
        'createdByUserId',
        'object',
        'objectId',
        'objectType',
      ],
    );
    await DB.getDB().execute(
      DB.getDB().generate(new Tasty.Query(versionTable).upsert(versions)),
    );
  }
  catch (e)
  {
    fail(e);
  }

  await request(server)
    .post('/midway/v1/auth/login')
    .send({
      email: 'admin@terraindata.com',
      password: 'CnAATPys6tEB*ypTvqRRP5@2fUzTuY!C^LZP#tBQcJiC*5',
    })
    .then((response) =>
    {
      const respData = JSON.parse(response.text);
      defaultUserAccessToken = respData.accessToken;
    })
    .catch((error) =>
    {
      winston.warn('Error while creating access token for default user: ' + String(error));
    });

  await request(server)
    .post('/midway/v1/users/')
    .send({
      id: 1,
      accessToken: defaultUserAccessToken,
      body: {
        email: 'test@terraindata.com',
        name: 'Test Person',
        password: 'Flash Flash Hundred Yard Dash',
        isSuperUser: false,
        isDisabled: false,
        timezone: 'UTC',
      },
    })
    .catch((error) =>
    {
      winston.warn('Error while creating test user: ' + String(error));
    });

  try
  {
    fs.unlinkSync(process.cwd() + '/midway/test/routes/scheduler/test_scheduled_export.json');
  }
  catch (e)
  {
    // do nothing
  }
  done();
});

afterAll(async () =>
{
  await DB.getDB().execute([['DROP TABLE IF EXISTS jobs;', 'DROP TABLE IF EXISTS schedules;'], undefined]);
});

describe('Status tests', () =>
{
  test('Check status: GET /midway/v1/status/', async () =>
  {
    await request(server)
      .get('/midway/v1/status/')
      .expect(200)
      .then((response) =>
      {
        const responseObject = JSON.parse(response.text);
        expect(responseObject.status).toBe('ok');
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/status/ request returned an error: ' + String(error));
      });
  });

  test('Check stats: GET /midway/v1/status/stats', async () =>
  {
    await request(server)
      .get('/midway/v1/status/stats')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
      })
      .expect(200)
      .then((response) =>
      {
        const responseObject = JSON.parse(response.text);
        winston.info(JSON.stringify(responseObject, null, 1));
        expect(responseObject.uptime > 0);
        expect(responseObject.numRequests > 0);
        expect(responseObject.numRequestsCompleted > 0 && responseObject.numRequestsCompleted < responseObject.numRequests);
        expect(responseObject.numRequestsPending === responseObject.numRequests - responseObject.numRequestsCompleted);
        expect(responseObject.numRequestsThatThrew >= 0 && responseObject.numRequestsThatThrew < responseObject.numRequests);
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/status/stats request returned an error: ' + String(error));
      });
  });
});

describe('User and auth route tests', () =>
{
  test('http login route: GET /midway/v1/auth/login', async () =>
  {
    await request(server)
      .post('/midway/v1/auth/login')
      .send({
        email: 'test@terraindata.com',
        password: 'Flash Flash Hundred Yard Dash',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(typeof respData['id']).toBe('number');
        expect(typeof respData['accessToken']).toBe('string');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/login request returned an error: ' + String(error));
      });
  });

  test('logout, attempt login with bad accessToken, get new accessToken', async () =>
  {
    let id: number = 0;
    let accessToken: string = '';
    await request(server)
      .post('/midway/v1/auth/login')
      .send({
        email: 'test@terraindata.com',
        password: 'Flash Flash Hundred Yard Dash',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(typeof respData['id']).toBe('number');
        expect(typeof respData['accessToken']).toBe('string');
        id = respData.id;
        accessToken = respData.accessToken;
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/login request returned an error: ' + String(error));
      });

    await request(server)
      .post('/midway/v1/auth/logout')
      .send({
        id,
        accessToken,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toBe('Success');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/logout request number 1 returned an error: ' + String(error));
      });

    await request(server)
      .post('/midway/v1/auth/logout')
      .send({
        id,
        accessToken,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/logout request number 2 returned an error: ' + String(error));
      });
  });
});

describe('Version route tests', () =>
{
  test('Get all versions: GET /midway/v1/versions', async () =>
  {
    await request(server)
      .get('/midway/v1/versions')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({
            createdAt: '2017-05-31T00:22:04.000Z',
            createdByUserId: 1,
            object: '{"id":2,"meta":"#realmusician","name":"Updated Item","parent":0,"status":"LIVE","type":"CATEGORY"}',
            objectId: 2,
            objectType: 'items',
          });
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/versions/items/1 request returned an error: ' + String(error));
      });
  });
});

describe('Item route tests', () =>
{
  test('Get all items: GET /midway/v1/items/', async () =>
  {
    await request(server)
      .get('/midway/v1/items/')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData)
          .toEqual(expect.arrayContaining([
            {
              id: 1,
              meta: 'I won a Nobel prize! But Im more proud of my music',
              name: 'Al Gore',
              parent: 0,
              status: 'Still Alive',
              type: 'GROUP',
            },
            {
              id: 3,
              meta: 'Are we an item?',
              name: 'Justin Bieber',
              parent: 0,
              status: 'Baby',
              type: 'ALGORITHM',
            },
          ]));
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Create item: POST /midway/v1/items/', async () =>
  {
    await request(server)
      .post('/midway/v1/items/')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          name: 'Test Item',
          status: 'LIVE',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({
            name: 'Test Item',
            status: 'LIVE',
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Get item: GET /midway/v1/items/:id', async () =>
  {
    await request(server)
      .get('/midway/v1/items/1')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0]).toMatchObject({
          id: 1,
          meta: 'I won a Nobel prize! But Im more proud of my music',
          name: 'Al Gore',
          parent: 0,
          status: 'Still Alive',
          type: 'GROUP',
        });
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Update item: POST /midway/v1/items/', async () =>
  {
    const insertObject = { id: 2, name: 'Updated Item', status: 'LIVE' };
    await request(server)
      .post('/midway/v1/items/2')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: insertObject,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0]).toMatchObject(insertObject);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Update item duplicate name: POST /midway/v1/items/', async () =>
  {
    const insertObject = { id: 2, name: 'Al Gore', status: 'LIVE' };
    await request(server)
      .post('/midway/v1/items/2')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: insertObject,
      })
      .expect(400)
      .then((response) =>
      {
        expect(JSON.parse(response.text).errors[0].detail).toBe('Duplicate item name');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Invalid update: POST /midway/v1/items/', async () =>
  {
    await request(server)
      .post('/midway/v1/items/314159265359')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          id: 314159265359,
          name: 'Test Item',
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info('response: "' + String(response) + '"');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Update with invalid status: POST /midway/v1/items/', async () =>
  {
    let id: number = 0;
    let accessToken: string = '';
    await request(server)
      .post('/midway/v1/auth/login')
      .send({
        email: 'test@terraindata.com',
        password: 'Flash Flash Hundred Yard Dash',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(typeof respData['id']).toBe('number');
        expect(typeof respData['accessToken']).toBe('string');
        id = respData.id;
        accessToken = respData.accessToken;
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/login request returned an error: ' + String(error));
      });

    await request(server)
      .post('/midway/v1/items/2')
      .send({
        id,
        accessToken,
        body: {
          id: 2,
          name: 'Test Item',
          status: 'BUILD',
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info('response: "' + String(response) + '"');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });
});

describe('Schema route tests', () =>
{
  test('GET /midway/v1/schema/', async () =>
  {
    await request(server)
      .get('/midway/v1/schema/')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
      });
  });
});

describe('Query route tests', () =>
{
  test('Elastic Search Query Result: POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          database: 1,
          type: 'search',
          body: JSON.stringify({
            from: 0,
            size: 0,
          }),
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(response.text);
        expect(JSON.parse(response.text))
          .toMatchObject({
            result: {
              timed_out: false,
              _shards: { failed: 0 },
              hits: { max_score: 0, hits: [] },
            }, errors: [],
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + String(error));
      });
  });

  test('Elastic Search Route Error: POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          database: 1,
          type: 'wrongtype',
          body: {
            from: 0,
            size: 0,
          },
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info(response.text);
        expect(JSON.parse(response.text)).toMatchObject(
          {
            errors: [
              {
                status: 400,
                title: 'Route /midway/v1/query/ has an error.',
                detail: 'Query type "wrongtype" is not currently supported.',
              },
            ],
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + String(error));
      });
  });

  test('Elastic Search Query Route: POST /midway/v1/query : templates',
    async () =>
    {
      const template: string = `{
          "from" : 0,
          "size" : {{#toJson}}size{{/toJson}},
          "query" : {
            "bool" : {
              "must" : [
                {"match" : {"_index" : "movies"}},
                {"match" : {"_type" : "data"}}
              ]
            }
          }
      }`;

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: defaultUserAccessToken,
          body: {
            database: 1,
            type: 'putTemplate',
            body: {
              id: 'testTemplateQuery',
              body: template,
            },
          },
        }).expect(200).then((response) =>
        {
          winston.info(response.text);
        }).catch((error) =>
        {
          fail(error);
        });

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: defaultUserAccessToken,
          body: {
            database: 1,
            type: 'getTemplate',
            body: {
              id: 'testTemplateQuery',
            },
          },
        }).expect(200).then((response) =>
        {
          winston.info(response.text);
          expect(JSON.parse(response.text)).toMatchObject(
            {
              result: {
                _id: 'testTemplateQuery',
                found: true,
                script: {
                  lang: 'mustache',
                  source: template,
                },
              }, errors: [], request: { database: 1, type: 'getTemplate', body: { id: 'testTemplateQuery' } },
            });
        }).catch((error) =>
        {
          fail(error);
        });

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: defaultUserAccessToken,
          body: {
            database: 1,
            type: 'deleteTemplate',
            body: {
              id: 'testTemplateQuery',
            },
          },
        }).expect(200).then((response) =>
        {
          winston.info(response.text);
          const respData = JSON.parse(response.text);
          expect(respData['result']).toMatchObject(
            {
              acknowledged: true,
            });
        });

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: defaultUserAccessToken,
          body: {
            database: 1,
            type: 'getTemplate',
            body: {
              id: 'testTemplateQuery',
            },
          },
        }).then((response) =>
        {
          winston.info(response.text);
          expect(JSON.parse(response.text)).toMatchObject(
            {
              errors: [
                // {
                //   status: 404,
                //   title: 'Not Found',
                // },
              ],
              result: {
                _id: 'testTemplateQuery',
                found: false,
              },
            });
        }).catch((error) =>
        {
          fail(error);
        });
    });

  test('Elastic groupJoin: POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          database: 1,
          type: 'search',
          body: `{
            "size": 5,
            "_source": ["movieid", "title"],
            "query": {
              "bool": {
                "filter": [
                  {
                    "term": {
                      "_index": "movies"
                    }
                  },
                  {
                    "term": {
                      "_type": "data"
                    }
                  }
                ],
                "must": [
                  { "match": { "status": "Released" } },
                  { "match": { "language": "en" } }
                ],
                "must_not": [
                  { "term": { "budget": 0 } },
                  { "term": { "revenue": 0 } }
                ]
              }
            },
            "groupJoin": {
              "parentAlias": "movie",
              "englishMovies": {
                "_source": ["movieid", "overview"],
                "query" : {
                  "bool" : {
                    "filter": [
                      { "term": {"movieid" : @movie.movieid} },
                      { "match": {"_index" : "movies"} },
                      { "match": {"_type" : "data"} }
                    ]
                  }
                }
              }
            }
          }`,
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(response.text);
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['errors'].length).toEqual(0);
        expect(respData['result'].hits.hits.length).toEqual(5);
        expect(respData['result'].hits.hits[0]._id === respData['result'].hits.hits[0].englishMovies[0]._id);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + String(error));
      });
  });

  test('Elastic groupJoin (empty parent result): POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          database: 1,
          type: 'search',
          body: `{
            "query": {
              "bool": {
                "filter": [
                  {
                    "term": {
                      "_index": "movies"
                    }
                  },
                  {
                    "bool": {
                      "filter": [
                        {
                          "term": {
                            "budget": {
                              "value": -1,
                              "boost": 1
                            }
                          }
                        }
                      ],
                      "should": [
                      ]
                    }
                  }
                ],
                "should": [
                  {
                    "bool": {
                      "filter": [
                        {
                          "exists": {
                            "field": "_id"
                          }
                        }
                      ],
                      "should": [
                      ]
                    }
                  }
                ]
              }
            },
            "from": 0,
            "size": 100,
            "track_scores": true,
            "_source": true,
            "script_fields": {
            },
            "groupJoin": {
              "movies": {
                "query": {
                  "bool": {
                    "filter": [
                      {
                        "term": {
                          "_index": "movies"
                        }
                      },
                      {
                        "bool": {
                          "filter": [
                          ],
                          "should": [
                          ]
                        }
                      }
                    ],
                    "should": [
                      {
                        "bool": {
                          "filter": [
                            {
                              "exists": {
                                "field": "_id"
                              }
                            }
                          ],
                          "should": [
                          ]
                        }
                      }
                    ]
                  }
                },
                "from": 0,
                "size": 3,
                "track_scores": true,
                "_source": true,
                "script_fields": {
                }
              },
              "parentAlias": "user"
            }
          }`,
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(response.text);
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['errors'].length).toEqual(0);
        expect(respData['result'].hits.hits.length).toEqual(0);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + String(error));
      });
  });

  test('Elastic mergeJoin query Result: POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          database: 1,
          type: 'search',
          body: `{
            "size": 5,
            "_source": ["movieid", "title"],
            "query": {
              "bool": {
                "filter": [
                  {
                    "term": {
                      "_index": "movies"
                    }
                  },
                  {
                    "term": {
                      "_type": "data"
                    }
                  }
                ],
                "must": [
                  { "match": { "status": "Released" } },
                  { "match": { "language": "en" } }
                ],
                "must_not": [
                  { "term": { "budget": 0 } },
                  { "term": { "revenue": 0 } }
                ]
              }
            },
            "mergeJoin": {
              "leftJoinKey": "movieid",
              "rightJoinKey": "movieid",
              "selfMergeJoin": {
                "_source": ["movieid", "overview"],
                "query" : {
                  "bool": {
                    "filter": [
                      { "match": {"_index" : "movies"} },
                      { "match": {"_type" : "data"} }
                    ],
                    "must_not": [
                      { "term": { "budget": 0 } },
                    ]
                  }
                },
                "sort": "revenue",
              }
            }
          }`,
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(response.text);
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['errors'].length).toEqual(0);
        expect(respData['result'].hits.hits.length).toEqual(5);
        for (let i = 0; i < respData['result'].hits.hits.length; ++i)
        {
          expect(respData['result'].hits.hits[i].movieid === respData['result'].hits.hits[i].selfMergeJoin[0].movieid);
          expect(respData['result'].hits.hits[i]._source.movieid === respData['result'].hits.hits[i].selfMergeJoin[0].movieid);
        }
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + String(error));
      });
  });
});

describe('Integration tests', () =>
{
  let integrationId = 0;
  const integration = {
    authConfig: {
      username: 'testuser',
      password: 'Terrain123!',
    },
    connectionConfig: {
      host: '10.1.1.103',
      port: 22,
    },
    createdBy: 1,
    lastModified: new Date(),
    meta: '',
    readPermission: '',
    writePermission: '',
    type: 'sftp',
    name: 'My SFTP Integration',
  };

  test('POST /midway/v1/integrations', async () =>
  {
    await request(server)
      .post('/midway/v1/integrations')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: integration,
      })
      .expect(200)
      .then((response) =>
      {
        const result = JSON.parse(response.text);
        const expected = JSON.parse(JSON.stringify(integration));
        expected.authConfig = null;
        delete result.lastModified;
        delete expected.lastModified;
        expect(result).toMatchObject(expected);
        integrationId = result['id'];
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/integrations request returned an error: ' + String(error));
      });
  });

  test('GET /midway/v1/integrations', async () =>
  {
    expect(integrationId).toBeGreaterThan(0);
    await request(server)
      .get('/midway/v1/integrations/' + String(integrationId))
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
      })
      .expect(200)
      .then((response) =>
      {
        const result = JSON.parse(response.text);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toEqual(1);
        const expected = JSON.parse(JSON.stringify(integration));
        delete expected.lastModified;
        expect(result[0]).toMatchObject(expected);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/integrations request returned an error: ' + String(error));
      });
  });

  test('Delete an integration: POST /midway/v1/integrations/delete', async () =>
  {
    expect(integrationId).toBeGreaterThan(0);
    await request(server)
      .post('/midway/v1/integrations/delete/' + String(integrationId))
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
      })
      .expect(200)
      .then((res) =>
      {
        expect(res.text).not.toBe('Unauthorized');
        const respData = JSON.parse(res.text);
        expect(respData).toMatchObject({});
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/integrations/1 request returned an error: ' + String(error));
      });
  });
});

describe('Analytics events route tests', () =>
{
  test('GET /midway/v1/events/agg (distinct)', async () =>
  {
    await request(server)
      .get('/midway/v1/events/agg')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
        database: 1,
        agg: 'distinct',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const result = JSON.parse(response.text);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toEqual(3);
      });
  });
});

describe('Analytics route tests', () =>
{
  test('GET /midway/v1/events/agg (select)', async () =>
  {
    await request(server)
      .get('/midway/v1/events/agg')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
        database: 1,
        start: new Date(2018, 2, 16, 7, 24, 4),
        end: new Date(2018, 2, 16, 7, 36, 4),
        eventname: 'impression',
        algorithmid: 'bestMovies3',
        agg: 'select',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['bestMovies3'].length).toEqual(4);
      });
  });

  test('GET /midway/v1/events/agg (histogram)', async () =>
  {
    await request(server)
      .get('/midway/v1/events/agg')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
        database: 1,
        start: new Date(2018, 2, 16, 7, 24, 4),
        end: new Date(2018, 2, 16, 7, 36, 4),
        eventname: 'impression',
        algorithmid: 'bestMovies3',
        agg: 'histogram',
        interval: 'minute',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['bestMovies3'].length).toEqual(8);
      });
  });

  test('GET /midway/v1/events/agg (rate)', async () =>
  {
    await request(server)
      .get('/midway/v1/events/agg')
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
        database: 1,
        start: new Date(2018, 3, 3, 7, 24, 4),
        end: new Date(2018, 3, 3, 10, 24, 4),
        eventname: 'click,impression',
        algorithmid: 'bestMovies3',
        agg: 'rate',
        interval: 'hour',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['bestMovies3'].length).toEqual(4);
      });
  });

  test('GET /midway/v1/events/metrics', async () =>
  {
    await request(server)
      .post('/midway/v1/events/metrics')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          database: 1,
          label: 'Clicks',
          events: 'click',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({
            database: 1,
            label: 'Clicks',
            events: 'click',
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });
});

describe('ETL Template Tests', () =>
{
  test('Create a template: POST /midway/v1/etl/templates/create', async () =>
  {
    const template = await promisify(fs.readFile)('./midway/test/etl/movies_template.json', 'utf8');
    await request(server)
      .post('/midway/v1/etl/templates/create')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: JSON.parse(template),
      })
      .expect(200)
      .then((res) =>
      {
        expect(res.text).not.toBe('Unauthorized');
        const respData = JSON.parse(res.text);
        const response = respData[0];
        expect(response.id).toBeGreaterThanOrEqual(1);
        templateId = response.id;
        expect(Date.parse(response.createdAt)).toBeLessThanOrEqual(Date.now());
        expect(Date.parse(response.lastModified)).toBeLessThanOrEqual(Date.now());
        expect(response.archived).toBeFalsy();
        expect(response.templateName).toBeDefined();
        expect(response.process).toBeDefined();
        expect(response.sources).toBeDefined();
        expect(response.sinks).toBeDefined();
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/etl/templates/create request returned an error: ' + String(error));
      });
  });

  test('Get a template: GET /midway/v1/etl/templates/:id', async () =>
  {
    expect(templateId).toBeGreaterThan(0);
    await request(server)
      .get('/midway/v1/etl/templates/' + String(templateId))
      .query({
        id: 1,
        accessToken: defaultUserAccessToken,
      })
      .expect(200)
      .then((res) =>
      {
        expect(res.text).not.toBe('Unauthorized');
        const respData = JSON.parse(res.text);
        const response = respData[0];
        expect(response.id).toEqual(templateId);
        expect(Date.parse(response.createdAt)).toBeLessThanOrEqual(Date.now());
        expect(Date.parse(response.lastModified)).toBeLessThanOrEqual(Date.now());
        expect(response.archived).toBeFalsy();
        expect(response.templateName).toBeDefined();
        expect(response.process).toBeDefined();
        expect(response.sources).toBeDefined();
        expect(response.sinks).toBeDefined();
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/etl/templates/1 request returned an error: ' + String(error));
      });
  });

  test('Delete a template: POST /midway/v1/etl/templates/delete', async () =>
  {
    expect(templateId).toBeGreaterThan(0);
    await request(server)
      .post('/midway/v1/etl/templates/delete')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          templateId,
        },
      })
      .expect(200)
      .then((res) =>
      {
        expect(res.text).not.toBe('Unauthorized');
        const respData = JSON.parse(res.text);
        expect(respData).toMatchObject({});
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/etl/templates/1 request returned an error: ' + String(error));
      });
  });
});

describe('ETL Execute Tests', () =>
{
  // TODO: Add more tests
});

describe('ETL Preview Tests', () =>
{
  // TODO Need to add an integration and then set the integration ID on the source (instead of using options.path)
  // test('Source preview: POST /midway/v1/etl/preview', async () =>
  // {
  //   await request(server)
  //     .post('/midway/v1/etl/preview')
  //     .send({
  //       id: 1,
  //       accessToken: defaultUserAccessToken,
  //       body: {
  //         source: {
  //           type: 'Fs',
  //           name: 'Default Source',
  //           fileConfig: {
  //             fileType: 'json',
  //             hasCsvHeader: true,
  //             jsonNewlines: false,
  //           },
  //           options: {
  //             path: './midway/test/etl/movies.json',
  //           },
  //         },
  //       },
  //     })
  //     .expect(200)
  //     .then((res) =>
  //     {
  //       expect(res.text).not.toBe('Unauthorized');
  //       const response = JSON.parse(res.text);
  //       expect(response.length).toEqual(5);
  //       expect(response[2].genres).toEqual('Documentary');
  //     })
  //     .catch((error) =>
  //     {
  //       fail('POST /midway/v1/etl/preview request returned an error: ' + String(error));
  //     });
  // });
});

describe('Scheduler tests', () =>
{
  test('POST /midway/v1/scheduler/ create scheduled ETL export', async () =>
  {
    await request(server)
      .post('/midway/v1/scheduler/')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          cron: '0 2 28 2 0', // some absurd leap year date at 2 AM
          name: 'test ETL',
          priority: 1,
          shouldRunNext: true,
          tasks:
            [
              {
                id: 1,
                taskId: 'taskETL',
                params:
                  {
                    templateId, // ETL template ID
                  },
              },
            ],
        },
      })
      .expect(200)
      .then(async (response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('POST /scheduler/create request returned empty response body');
        }
        const result = JSON.parse(response.text);
        expect(result.length).not.toEqual(0);
        expect(Object.keys(result).lastIndexOf('errors')).toEqual(-1);
        schedulerExportId = result[0]['id'];
      });
  }, 70000);

  /*
    TODO: Add this test case back when we add ETL execute tests
    test('POST /midway/v1/scheduler/run/<schedule ID> run now', async () =>
    {
      await request(server)
        .post('/midway/v1/scheduler/run/' + schedulerExportId.toString())
        .send({
          id: 1,
          accessToken: defaultUserAccessToken,
          body: {
          },
        })
        .expect(200)
        .then(async (responseRun) =>
        {
          expect(await new Promise<boolean>(async (resolve, reject) =>
          {
            function verifyFileWritten()
            {
              resolve(fs.existsSync(process.cwd() + '/midway/test/routes/scheduler/test_scheduled_export.json'));
            }
            setTimeout(verifyFileWritten, 3000);
          })).toBe(true);
        });
    });
    */

  test('POST /midway/v1/scheduler/ create INVALID scheduled export', async () =>
  {
    await request(server)
      .post('/midway/v1/scheduler/')
      .send({
        id: 1,
        accessToken: defaultUserAccessToken,
        body: {
          invalidCronName: '0 2 29 2 0', // some absurd leap year date at 2 AM
          name: 'invalid test ETL',
          priority: 1,
          shouldRunNext: true,
          tasks:
            [
              {
                id: 1,
                taskId: 'taskDefaultExit',
              },
            ],
        },
      })
      .expect(400)
      .then(async (response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('POST /scheduler/ create INVALID scheduled export request returned empty response body');
        }
        const result = JSON.parse(response.text);
        expect(Object.keys(result).lastIndexOf('errors')).not.toEqual(-1);
      });
  });
});
