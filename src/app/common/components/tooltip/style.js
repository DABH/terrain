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

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = '.__react_component_tooltip{border-radius:3px;display:inline-block;font-size:13px;left:-999em;opacity:0;padding:8px 21px;position:fixed;pointer-events:none;transition:opacity 0.3s ease-out , margin-top 0.3s ease-out, margin-left 0.3s ease-out;top:-999em;visibility:hidden;z-index:999}.__react_component_tooltip:before,.__react_component_tooltip:after{content:"";width:0;height:0;position:absolute}.__react_component_tooltip.show{opacity:0.9;margin-top:0px;margin-left:0px;visibility:visible}.__react_component_tooltip.type-dark{color:#fff;background-color:#222}.__react_component_tooltip.def-dark.place-top:after{border-top:6px solid #222}.__react_component_tooltip.def-dark.place-bottom:after{border-bottom:6px solid #222}.__react_component_tooltip.def-dark.place-left:after{border-left:6px solid #222}.__react_component_tooltip.def-dark.place-right:after{border-right:6px solid #222}.__react_component_tooltip.def-dark.border{border:1px solid #fff}.__react_component_tooltip.def-dark.border.place-top:before{border-top:8px solid #fff}.__react_component_tooltip.def-dark.border.place-bottom:before{border-bottom:8px solid #fff}.__react_component_tooltip.def-dark.border.place-left:before{border-left:8px solid #fff}.__react_component_tooltip.def-dark.border.place-right:before{border-right:8px solid #fff}.__react_component_tooltip.def-success{color:#fff;background-color:#8DC572}.__react_component_tooltip.def-success.place-top:after{border-top:6px solid #8DC572}.__react_component_tooltip.def-success.place-bottom:after{border-bottom:6px solid #8DC572}.__react_component_tooltip.def-success.place-left:after{border-left:6px solid #8DC572}.__react_component_tooltip.def-success.place-right:after{border-right:6px solid #8DC572}.__react_component_tooltip.def-success.border{border:1px solid #fff}.__react_component_tooltip.def-success.border.place-top:before{border-top:8px solid #fff}.__react_component_tooltip.def-success.border.place-bottom:before{border-bottom:8px solid #fff}.__react_component_tooltip.def-success.border.place-left:before{border-left:8px solid #fff}.__react_component_tooltip.def-success.border.place-right:before{border-right:8px solid #fff}.__react_component_tooltip.def-warning{color:#fff;background-color:#F0AD4E}.__react_component_tooltip.def-warning.place-top:after{border-top:6px solid #F0AD4E}.__react_component_tooltip.def-warning.place-bottom:after{border-bottom:6px solid #F0AD4E}.__react_component_tooltip.def-warning.place-left:after{border-left:6px solid #F0AD4E}.__react_component_tooltip.def-warning.place-right:after{border-right:6px solid #F0AD4E}.__react_component_tooltip.def-warning.border{border:1px solid #fff}.__react_component_tooltip.def-warning.border.place-top:before{border-top:8px solid #fff}.__react_component_tooltip.def-warning.border.place-bottom:before{border-bottom:8px solid #fff}.__react_component_tooltip.def-warning.border.place-left:before{border-left:8px solid #fff}.__react_component_tooltip.def-warning.border.place-right:before{border-right:8px solid #fff}.__react_component_tooltip.def-error{color:#fff;background-color:#BE6464}.__react_component_tooltip.def-error.place-top:after{border-top:6px solid #BE6464}.__react_component_tooltip.def-error.place-bottom:after{border-bottom:6px solid #BE6464}.__react_component_tooltip.def-error.place-left:after{border-left:6px solid #BE6464}.__react_component_tooltip.def-error.place-right:after{border-right:6px solid #BE6464}.__react_component_tooltip.def-error.border{border:1px solid #fff}.__react_component_tooltip.def-error.border.place-top:before{border-top:8px solid #fff}.__react_component_tooltip.def-error.border.place-bottom:before{border-bottom:8px solid #fff}.__react_component_tooltip.def-error.border.place-left:before{border-left:8px solid #fff}.__react_component_tooltip.def-error.border.place-right:before{border-right:8px solid #fff}.__react_component_tooltip.def-info{color:#fff;background-color:#337AB7}.__react_component_tooltip.def-info.place-top:after{border-top:6px solid #337AB7}.__react_component_tooltip.def-info.place-bottom:after{border-bottom:6px solid #337AB7}.__react_component_tooltip.def-info.place-left:after{border-left:6px solid #337AB7}.__react_component_tooltip.def-info.place-right:after{border-right:6px solid #337AB7}.__react_component_tooltip.def-info.border{border:1px solid #fff}.__react_component_tooltip.def-info.border.place-top:before{border-top:8px solid #fff}.__react_component_tooltip.def-info.border.place-bottom:before{border-bottom:8px solid #fff}.__react_component_tooltip.def-info.border.place-left:before{border-left:8px solid #fff}.__react_component_tooltip.def-info.border.place-right:before{border-right:8px solid #fff}.__react_component_tooltip.def-light{color:#222;background-color:#fff}.__react_component_tooltip.def-light.place-top:after{border-top:6px solid #fff}.__react_component_tooltip.def-light.place-bottom:after{border-bottom:6px solid #fff}.__react_component_tooltip.def-light.place-left:after{border-left:6px solid #fff}.__react_component_tooltip.def-light.place-right:after{border-right:6px solid #fff}.__react_component_tooltip.def-light.border{border:1px solid #222}.__react_component_tooltip.def-light.border.place-top:before{border-top:8px solid #222}.__react_component_tooltip.def-light.border.place-bottom:before{border-bottom:8px solid #222}.__react_component_tooltip.def-light.border.place-left:before{border-left:8px solid #222}.__react_component_tooltip.def-light.border.place-right:before{border-right:8px solid #222}.__react_component_tooltip.place-top{margin-top:-10px}.__react_component_tooltip.place-top:before{border-left:10px solid transparent;border-right:10px solid transparent;bottom:-8px;left:50%;margin-left:-10px}.__react_component_tooltip.place-top:after{border-left:8px solid transparent;border-right:8px solid transparent;bottom:-6px;left:50%;margin-left:-8px}.__react_component_tooltip.place-bottom{margin-top:10px}.__react_component_tooltip.place-bottom:before{border-left:10px solid transparent;border-right:10px solid transparent;top:-8px;left:50%;margin-left:-10px}.__react_component_tooltip.place-bottom:after{border-left:8px solid transparent;border-right:8px solid transparent;top:-6px;left:50%;margin-left:-8px}.__react_component_tooltip.place-left{margin-left:-10px}.__react_component_tooltip.place-left:before{border-top:6px solid transparent;border-bottom:6px solid transparent;right:-8px;top:50%;margin-top:-5px}.__react_component_tooltip.place-left:after{border-top:5px solid transparent;border-bottom:5px solid transparent;right:-6px;top:50%;margin-top:-4px}.__react_component_tooltip.place-right{margin-left:10px}.__react_component_tooltip.place-right:before{border-top:6px solid transparent;border-bottom:6px solid transparent;left:-8px;top:50%;margin-top:-5px}.__react_component_tooltip.place-right:after{border-top:5px solid transparent;border-bottom:5px solid transparent;left:-6px;top:50%;margin-top:-4px}.__react_component_tooltip .multi-line{display:block;padding:2px 0px;text-align:center}';
