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

// MIDWAY head file
require('babel-core/register');
const Koa = require('koa');
const app = new Koa();
const winston = require('winston');
const cmdLineArgs = require('command-line-args');
const webpack = require('webpack');
const webpackConfig = require('../webpack.config.js');
const bodyParser = require('koa-body-parser');
const request = require('koa-request');

const reqText = require('require-text');
const index = require('require-text')('../src/app/index.html', require);

const router = require('./Routes.tsx');

const optDefs = [
  {name: 'port', alias: 'p', type: Number, defaultValue: 3000},
  {name: 'db', alias: 'r', type: String, defaultValue: 'mysql'},
];

const args = cmdLineArgs(optDefs);

app.use(bodyParser());

router.post('/oauth2', async (next) => {
  console.log(next);
});

router.get('/bundle.js', async (next) => {
//   let response = yield request({
//     method: 'GET',
//     url: 'http://localhost:8080/bundle.js',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify({ param1: 'Hello World from A' })
//   });
//   next.body = response.body;
});

router.get('/', async (next) => {
  next.body = index.toString();
});

app.use(router.routes(), router.allowedMethods());

app.listen(args.port);

// TODO list
// - import HTML rather than writing directly inline
// - kick off webpack dev server when in DEV mode (and kill it when server stops)
// - difference between prod and dev mode: prod references bundle.js static file

