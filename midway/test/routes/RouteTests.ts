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

import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import * as request from 'supertest';
import * as winston from 'winston';
import App from '../../src/app/App';
import { readFile } from '../Utils';

let server;

/* tslint:disable:max-line-length */

beforeAll(async (done) =>
{
  const testDBName = 'midwaytest.db';
  if (fs.existsSync(testDBName))
  {
    fs.unlinkSync(testDBName);
  }

  const db = new sqlite3.Database(testDBName);
  const options =
    {
      debug: true,
      db: 'sqlite',
      dsn: testDBName,
      port: 43001,
      databases: [
        {
          name: 'My ElasticSearch Instance',
          type: 'elastic',
          dsn: 'http://127.0.0.1:9200',
          host: 'http://127.0.0.1:9200',
        },
      ],
    };

  const app = new App(options);
  server = await app.start();

  const sql = await readFile('./midway/test/scripts/test.sql');
  const results = await new Promise((resolve, reject) =>
  {
    return db.exec(sql.toString(), (error: Error) =>
    {
      if (error !== null && error !== undefined)
      {
        reject(error);
      }
      resolve();
    });
  });

  request(server)
    .post('/midway/v1/users/')
    .send({
      id: 1,
      accessToken: 'AccessToken',
      body: {
        email: 'test@terraindata.com',
        name: 'Test Person',
        password: 'Flash Flash Hundred Yard Dash',
        isSuperUser: false,
        isDisabled: false,
        timezone: 'UTC',
      },
    })
    .end(() =>
    {
      done();
    });
});

afterAll(() =>
{
  fs.unlinkSync('midwaytest.db');
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
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({ accessToken: '', email: 'test@terraindata.com', id });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/logout request returned an error: ' + String(error));
      });

    await request(server)
      .post('/midway/v1/auth/logout')
      .send({
        id,
        accessToken,
      })
      .expect(401)
      .then((response) =>
      {
        expect(response.text).toBe('Unauthorized');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/logout request returned an error: ' + String(error));
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
        accessToken: 'AccessToken',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({
            createdAt: '2017-05-31 00:22:04',
            createdByUserId: 1,
            id: 1,
            object: '{"id":2,"meta":"#realmusician","name":"Updated Item","parent":0,"status":"LIVE","type":"GROUP"}',
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
        accessToken: 'AccessToken',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData)
          .toMatchObject([
            {
              id: 1,
              meta: 'I won a Nobel prize! But Im more proud of my music',
              name: 'Al Gore',
              parent: 0,
              status: 'Still Alive',
              type: 'ALGORITHM',
            },
            {
              id: 2,
              meta: '#realmusician',
              parent: 0,
              type: 'GROUP',
            },
            {
              id: 3,
              meta: 'Are we an item?',
              name: 'Justin Bieber',
              parent: 0,
              status: 'Baby',
              type: 'VARIANT',
            },
          ]);
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
        accessToken: 'AccessToken',
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
            id: 4,
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
        accessToken: 'AccessToken',
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
          type: 'ALGORITHM',
        });
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Update item: POST /midway/v1/items/', async () =>
  {
    const insertOjbect = { id: 2, name: 'Updated Item', status: 'LIVE' };
    await request(server)
      .post('/midway/v1/items/2')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: insertOjbect,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0]).toMatchObject(insertOjbect);
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
        accessToken: 'AccessToken',
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
        accessToken: 'AccessToken',
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
        accessToken: 'AccessToken',
        body: {
          database: 1,
          type: 'search',
          body: {
            index: 'movies',
            type: 'data',
            from: 0,
            size: 0,
            body: {
              query: {},
            },
          },
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

  test('Elastic Search Query Error: POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          database: 1,
          type: 'search',
          body: {
            index: 'wrongindex',
            type: 'data',
            from: 0,
            size: 0,
            body: {
              query: {},
            },
          },
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(response.text);
        expect(JSON.parse(response.text)).toMatchObject(
          {
            result: {},
            errors: [
              {
                status: 404,
                // tslint:disable-next-line:max-line-length
                title: '[index_not_found_exception] no such index, with { resource.type="index_or_alias" & resource.id="wrongindex" & index_uuid="_na_" & index="wrongindex" }',
              },
            ],
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
        accessToken: 'AccessToken',
        body: {
          database: 1,
          type: 'wrongtype',
          body: {
            index: 'wrongindex',
            type: 'data',
            from: 0,
            size: 0,
            body: {
              query: {},
            },
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
                   "index" : "movies",
                   "type" : "data",
                   "from" : 0,
                   "size" : {{#toJson}}size{{/toJson}},
                   "body" : {
                     "query" : {
                      }
                   }
                }`;

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: 'AccessToken',
          body: {
            database: 1,
            type: 'putTemplate',
            body: {
              id: 'testTemplateQuery',
              body: {
                template,
              },
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
          accessToken: 'AccessToken',
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
                lang: 'mustache',
                found: true,
                template,
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
          accessToken: 'AccessToken',
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
        });

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: 'AccessToken',
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
                {
                  status: 404,
                  title: 'Not Found',
                },
              ],
            });
        }).catch((error) =>
        {
          fail(error);
        });
    });
});

describe('File import route tests', () =>
{
  // test('Import JSON: POST /midway/v1/import/', async () =>
  // {
  //   await request(server)
  //     .post('/midway/v1/import/')
  //     .send({
  //       id: 1,
  //       accessToken: 'AccessToken',
  //       body: {
  //         dbid: 1,
  //         dbname: 'test_elastic_db',
  //         tablename: 'fileImportTestTable',
  //         contents: '[{"pkey":1,"column1":"hello","col2":"goodbye","col3":false,"col4":null}]',
  //         filetype: 'json',
  //         update: true,
  //
  //         originalNames: ['pkey', 'column1', 'col2', 'col3', 'col4'],
  //         columnTypes:
  //         {
  //           pkey: { type: 'long' },
  //           col1: { type: 'text' },
  //           col3: { type: 'boolean' },
  //           col4: { type: 'date' },
  //         },
  //         primaryKey: 'pkey',
  //         transformations: [
  //           {
  //             name: 'rename',
  //             colName: 'column1',
  //             args: { newName: 'col1' },
  //           },
  //         ],
  //       },
  //     })
  //     .expect(200)
  //     .then((response) =>
  //     {
  //       expect(response.text).not.toBe('Unauthorized');
  //       const respData = JSON.parse(response.text);
  //       expect(respData.length).toBeGreaterThan(0);
  //       expect(respData[0])
  //         .toMatchObject({
  //           pkey: 1,
  //           col1: 'hello',
  //           col3: false,
  //           col4: null,
  //         });
  //     })
  //     .catch((error) =>
  //     {
  //       fail('POST /midway/v1/import/ request returned an error: ' + String(error));
  //     });
  // });
  //
  // test('Import CSV: POST /midway/v1/import/', async () =>
  // {
  //   await request(server)
  //     .post('/midway/v1/import/')
  //     .send({
  //       id: 1,
  //       accessToken: 'AccessToken',
  //       body: {
  //         dbid: 1,
  //         dbname: 'test_elastic_db',
  //         tablename: 'fileImportTestTable',
  //         contents: 'pkey,column1,column2,sillyname,column4\n1,hi,hello,false,1970-01-01\n2,bye,goodbye,,',
  //         filetype: 'csv',
  //         update: true,
  //
  //         csvHeaderMissing: false,
  //         originalNames: ['pkey', 'column1', 'column2', 'column3', 'column4'],
  //         columnTypes:
  //         {
  //           pkey: { type: 'long' },
  //           column1: { type: 'text' },
  //           column3: { type: 'boolean' },
  //           column4: { type: 'date' },
  //         },
  //         primaryKey: 'pkey',
  //         transformations: [],
  //       },
  //     })
  //     .expect(200)
  //     .then((response) =>
  //     {
  //       expect(response.text).not.toBe('Unauthorized');
  //       const respData = JSON.parse(response.text);
  //       expect(respData.length).toBeGreaterThan(0);
  //       expect(respData[0])
  //         .toMatchObject({
  //           pkey: 1,
  //           column1: 'hi',
  //           column3: false,
  //           column4: new Date(Date.parse('1970-01-01')).toISOString(),
  //         });
  //       expect(respData[1])
  //         .toMatchObject({
  //           pkey: 2,
  //           column1: 'bye',
  //           column3: null,
  //           column4: null,
  //         });
  //     })
  //     .catch((error) =>
  //     {
  //       fail('POST /midway/v1/import/ request returned an error: ' + String(error));
  //     });
  // });
  //
  // test('Invalid import: POST /midway/v1/import/', async () =>
  // {
  //   await request(server)
  //     .post('/midway/v1/import/')
  //     .send({
  //       id: 1,
  //       accessToken: 'AccessToken',
  //       body: {
  //         dbid: 1,
  //         dbname: 'test_elastic_db',
  //         tablename: 'fileImportTestTable',
  //         contents: '{"pkey":1,"column1":"hello","column2":"goodbye"}',
  //         filetype: 'json',
  //         update: true,
  //
  //         originalNames: ['pkey', 'column1', 'column2'],
  //         columnTypes:
  //         {
  //           pkey: { type: 'long' },
  //           column1: { type: 'text' },
  //           column2: { type: 'text' },
  //         },
  //         primaryKey: 'pkey',
  //         transformations: [],
  //       },
  //     })
  //     .expect(400)
  //     .then((response) =>
  //     {
  //       winston.info('response: "' + String(response) + '"');
  //     })
  //     .catch((error) =>
  //     {
  //       fail('POST /midway/v1/import/ request returned an error: ' + String(error));
  //     });
  // });
});

describe('File import templates route tests', () =>
{
  test('Create template: POST /midway/v1/templates/create', async () =>
  {
    await request(server)
      .post('/midway/v1/templates/create')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          name: 'my_template',

          dbid: 1,
          dbname: 'test_elastic_db',
          tablename: 'fileImportTestTable',

          originalNames: ['pkey', 'column1', 'column2'],
          columnTypes:
          {
            pkey: { type: 'long' },
            column1: { type: 'text' },
            column2: { type: 'text' },
          },
          primaryKey: 'pkey',
          transformations: [],
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
            id: 1,
            name: 'my_template',

            dbid: 1,
            dbname: 'test_elastic_db',
            tablename: 'fileImportTestTable',

            originalNames: ['pkey', 'column1', 'column2'],
            columnTypes:
            {
              pkey: { type: 'long' },
              column1: { type: 'text' },
              column2: { type: 'text' },
            },
            primaryKey: 'pkey',
            transformations: [],
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/templates/create request returned an error: ' + String(error));
      });
  });

  test('Get all templates: GET /midway/v1/templates/', async () =>
  {
    await request(server)
      .get('/midway/v1/templates/')
      .query({
        id: 1,
        accessToken: 'AccessToken',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0]).toMatchObject({
          id: 1,
          name: 'my_template',

          dbid: 1,
          dbname: 'test_elastic_db',
          tablename: 'fileImportTestTable',

          originalNames: ['pkey', 'column1', 'column2'],
          columnTypes:
          {
            pkey: { type: 'long' },
            column1: { type: 'text' },
            column2: { type: 'text' },
          },
          primaryKey: 'pkey',
          transformations: [],
        });
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/templates/ request returned an error: ' + String(error));
      });
  });

  test('Get filtered templates: POST /midway/v1/templates/', async () =>
  {
    await request(server)
      .post('/midway/v1/templates/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          dbid: 1,
          dbname: 'badname',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toEqual(0);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/templates/ request returned an error: ' + String(error));
      });
  });
});
