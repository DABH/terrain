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

require('./Periscope.less');

import * as d3 from 'd3';
import Util from '../util/Util.tsx';

var xMargin = 45;
var yMargin = 15;

var scaleMin = (scale) => scale.range()[0];
var scaleMax = (scale) => scale.range()[scale.range().length - 1];

var Periscope = {
  
  create(el, props, state)
  {
    var svg = d3
      .select(el)
      .append('svg')
      .attr('class', 'periscope')
      .attr('width', props.width)
      .attr('height', props.height);
    
    svg.append('rect')
      .attr('class', 'bg');
    svg.append('g')
      .attr('class', 'bottomAxis');
    
    var innerSvg = svg.append('svg')
      .attr('class', 'inner-svg')
      .attr('x', xMargin)
      .attr('y', 0);
        
    innerSvg.append('g')
      .attr('class', 'bars');
    
    svg.append('rect')
      .attr('class', 'line');
    svg.append('g')
      .attr('class', 'handles');
    
    this.update(el, state);
  },
  
  update(el, state)
  {
    state.numBars = 10;
    var scales = this._scales(el, state.maxRange, state.domain, state.barsData);
    this._draw(el, scales, state.domain, state.barsData, state.onDomainChange, state.colors);
  },
  
  destroy(el)
  {
    // cleanup here
  },
  
  
  // "private" stuff
  
  _drawBg(el, scales)
  {
    d3.select(el).select('.bg')
      .attr('x', scaleMin(scales.x))
      .attr('width', scaleMax(scales.x) - scaleMin(scales.x))
      .attr('y', scaleMax(scales.pointY))
      .attr('height', scaleMin(scales.pointY) - scaleMax(scales.pointY))
      .attr('fill', '#f0f8e8');
  },
  
  _drawAxes(el, scales)
  {
    var bottomAxis = d3.svg.axis()
      .scale(scales.x)
      .ticks(10)
      .tickSize(10)
      .orient("bottom");
    d3.select(el).select('.bottomAxis')
      .attr('transform', 'translate(0, ' + scaleMin(scales.pointY) + ')')
      .call(bottomAxis);
  },
  
  
  _drawBars(el, scales, barsData, color)
  {
    var g = d3.select(el).selectAll('.bars');
    
    var bar = g.selectAll('.bar')
      .data(barsData, (d) => d['id']);
    
    var xPadding = 0;
    
    var barWidth = (d) => {
      var width = scales.realX(d['range']['max']) - scales.realX(d['range']['min']) - 2 * xPadding
      if(width < 1)
      {
        width = 1
      }
      return width;
    }
    
    bar.enter()
      .append('rect')
      .attr('class', 'bar');
    
    bar
      .attr('fill', color)
      .attr('x', (d) => scales.realX(d['range']['min']) + xPadding)
      .attr('width', barWidth)
      .attr('y', (d) => scales.realBarY(d['percentage']))
      .attr('height', (d) => scaleMin(scales.realBarY) - scales.realBarY(d['percentage']));
    
    bar.exit().remove();
  },
  
  _drawLine(el, scales, domain)
  {
    var lineFunction = d3.svg.line()
      .x((d) => scales.x(d))
      .y((d) => scaleMin(scales.barY));
    
    var height = 4;
    d3.select(el).select('.line')
      .attr("x", scales.x(domain.x[0]))
      .attr('width', scales.x(domain.x[1]) - scales.x(domain.x[0]))
      .attr('y', scaleMin(scales.barY) - height / 2)
      .attr('height', height);
  },
  
  // needs to be "function" for d3.mouse(this)
  _mousedownFactory: (el, onMove, scale, domain) => function(event) {
    var del = d3.select(el);
    var handle = d3.select(this);
    var startMouseX = d3.mouse(this)[0];
    var startHandleX = parseInt(handle.attr('cx'), 10);
    
    var initialClasses = handle.attr('class');
    handle.attr('class', initialClasses + ' handle-active');
    
    var move = function(event) {
      var diffX = d3.mouse(this)[0] - startMouseX;
      var newX = startHandleX + diffX;
      
      // Note: in the future, for optimistic / faster rendering,
      //  you could use a line like this one:
      //  point.attr('cy', startPointY + diffY);
      
      var newValue = scale.clamp(true).invert(newX);
      var handleIndex = handle.attr('_id');
      
      if(handle.attr('_id') === '0' && newValue > domain.x[1] * 0.99)
      {
        newValue = domain.x[1] * 0.99;
      }
      
      if(handle.attr('_id') === '1' && newValue < domain.x[0] * 1.01)
      {
        newValue = domain.x[0] * 1.01;
      }
      
      onMove(handle.attr('_id'), newValue);
    }
    
    del.on('mousemove', move);
    del.on('touchmove', move);
    
    var offFn = () => {
      del.on('mousemove', null)
      del.on('touchmove', null)
      handle.attr('class', initialClasses);
    };
    del.on('mouseup', offFn);
    del.on('touchend', offFn);
    del.on('mouseleave', offFn);
  },
  
  _drawHandles(el, scales, domain, onDomainChange)
  {
    var g = d3.select(el).selectAll('.handles');
    var handle = g.selectAll('.handle')
      .data(domain.x, (d, i) => "" + i);
    
    handle.enter()
      .append('circle')
      .attr('class', 'handle');
    
    handle
      .attr('cx', (d) => scales.x(d))
      .attr('cy', scaleMin(scales.barY))
      .attr('fill', '#fff')
      .attr('stroke', "#f00")
      .attr('stroke-width', '3px')
      .attr('r',  10);
    
    handle
      .attr('_id', (d, i) => i);
      
    handle.on('mousedown', this._mousedownFactory(el, onDomainChange, scales.x, domain));
    handle.on('touchstart', this._mousedownFactory(el, onDomainChange, scales.x, domain));
    
    handle.exit().remove();
  },
  
  _draw(el, scales, domain, barsData, onDomainChange, colors)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realBarY));
      
    this._drawBg(el, scales);
    this._drawAxes(el, scales);
    this._drawBars(el, scales, barsData, colors.bar);
    this._drawLine(el, scales, domain);
    this._drawHandles(el, scales, domain, onDomainChange);
  },
  
  _scales(el, range, domain, barsData)
  {
    if(!domain)
    {
      return null;
    }
    var width = el.offsetWidth - xMargin;
    var height = el.offsetHeight - yMargin;
    
    var x = d3.scale.linear()
      .range([xMargin, width])
      .domain(range);
    
    var realX = d3.scale.linear()
      .range([0, width - xMargin])
      .domain(range);
    
    var pointY = d3.scale.linear()
      .range([height - yMargin, 0])
      .domain(domain.y);
    
    var realPointY = d3.scale.linear()
      .range([height - yMargin, 0])
      .domain(domain.y);
    
    var barsMax = barsData.reduce((max, bar) =>
      (max === false || bar.percentage > max ? bar.percentage : max)
      , false);
    
    var barY = d3.scale.linear()
      .range([height - yMargin, 0])
      .domain([0, barsMax]);
   
    var realBarY = d3.scale.linear()
      .range([height - yMargin, 0])
      .domain([0, barsMax]);

    return {
      x,
      pointY,
      barY,
      realX,
      realPointY,
      realBarY,
    }; 
  },
  
};

export default Periscope;