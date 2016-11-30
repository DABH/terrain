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

import * as $ from 'jquery';
import * as moment from 'moment';
import * as React from 'react';
import * as ReactDOM from "react-dom";
import * as Immutable from "immutable";
import * as _ from 'underscore';

import BrowserTypes from './../browser/BrowserTypes.tsx';

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
const suffixes = ['', ' k', ' M', ' B'];

var keyPathForId = (node: any, id: string): ((string | number)[] | boolean) =>
  {
    if(node.get('id') === id)
    {
      return true;
    }
    
    return node.reduce((keyPath, value, key) =>
    {
      if(keyPath)
      {
        return keyPath;
      }
      
      if(Immutable.Iterable.isIterable(value))
      {
        var kp = keyPathForId(value, id);
        if(kp)
        {
          return ([key]).concat(kp === true ? [] : kp);
        }
      }
    }, false);
  }

var Util = {
	// Return a random integer [min, max)
	// assumes min of 0 if not passed.
	randInt(...args: number[]): number 
	{
		var min:number = arguments[0], max:number = arguments[1];
		if(arguments.length === 1) {
			min = 0;
			max = arguments[0];
		}

		return Math.floor(Math.random() * (max - min)) + min;
	},
  
  moment(str:string)
  {
    return moment(new Date(str));
  },
  
  asJS(obj:any)
  {
    if(obj && typeof obj.toJS === 'function')
    {
      return obj.toJS();
    }
    return obj;
  },
  
  haveRole(groupId: ID, role: string, UserStore, RolesStore)
  {
    let me = UserStore.getState().get('currentUser');
    if(!me)
    {
      return false;
    }
    
    return !! RolesStore.getState().getIn([groupId, me.username, role]);
  },
  
  canEdit(item: BrowserTypes.Variant | BrowserTypes.Algorithm | BrowserTypes.Group, UserStore, RolesStore)
  {
    let me = UserStore.getState().get('currentUser');
    if(!me)
    {
      return false;
    }
    if(item.type === 'group' && me.isAdmin)
    {
      return true;
    }
    
    let groupId = item.type === 'group' ? item.id : item['groupId'];
    if(Util.haveRole(groupId, 'admin', UserStore, RolesStore))
    {
      return true;
    }
    
    if(item.type !== 'group')
    {
      return Util.haveRole(groupId, 'builder', UserStore, RolesStore)
    }
    
    return false;
  },
  
  mapEnum(_enum: any, fn: (e: string) => any)
  {
    let ans = [];
    for (var item in _enum) {
      if (_enum.hasOwnProperty(item) && /^\d+$/.test(item)) {
        ans.push(fn(item));
      }
    }
    return ans;
  },

  formatDate(date):string
  {
    let then = moment(date);
    let now = moment();
    let hour = ' at ' + then.format('h:mma');
    
    if(then.format('MMMM Do YYYY') === now.format('MMMM Do YYYY'))
    {
      // it was today
      return 'Today at' + hour;
    }
    
    if(then.format('YYYY') === now.format('YYYY'))
    {
      // same year
      return then.format('MM/DD/YY') + hour
    }
    
    return then.format('MM/DD/YY') + hour;
  },
  
  formatNumber(n: number, precision: number = 3): string
  {
    if(!n)
    {
      return n + "";
    }
    
    let sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    
    if(n > 0.01 && n < 1000000000000) // 10^12
    {
      let pwr = Math.floor(Math['log10'](n));
      let str = n.toPrecision(precision);
      let suffix = '';
      
      if(pwr > 0)
      {
        suffix = suffixes[Math.floor(pwr / 3)];
        let decimalIndex = pwr % 3 + 1;
        str = n + "";
        str = str.substr(0, precision);
        if(decimalIndex < str.length)
        {
          str = str.slice(0, decimalIndex) + '.' + str.slice(decimalIndex);
        }
        else if(decimalIndex > str.length)
        {
          // need to add extra 0's
          _.range(0, decimalIndex - str.length).map(
            i => str = str + '0'
          );
        }
      }
      
      while(str.length > 1 && 
        str.indexOf('.') > 0 &&
        (str.charAt(str.length - 1) === '0' || str.charAt(str.length - 1) === '.')
      )
      {
        // if there are extra 0's after the decimal point, trim them (and the point if necessary)
        str = str.substr(0, str.length - 1);
      }
      
      return sign + str + suffix;
    }
    
    return sign + n.toExponential(precision);
  },
  
  getId(): ID
  {
    // TODO have this fetch a list of IDs from server,
    // give IDs from that list
    return _.range(0, 5).map(i => chars[Util.randInt(chars.length)]).join("");
  },
  
  extendId(obj: Object): Object
  {
    return _.extend({}, { id: Util.getId() }, _.omit(obj, value => value === undefined));
  },
  
  moveIndexOffset(index: number, newIndex: number): number
  {
    return index < newIndex ? -1 : 0;
  },
  
  setValuesToKeys(obj: any, prefix: string)
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
        Util.setValuesToKeys(obj[key], value);
      }
      else
      {
        throw "Value found in ActionTypes that is neither string or object of strings: key: " + key + ", value: " + obj[key];
      }
    }
  },
  
  rel(target): string
  {
    return Util.attr(target, 'rel');
  },
  
  attr(target, key: string): string
  {
    return ReactDOM.findDOMNode(target).getAttribute(key);
  },
  
  // corrects a given index so that it is appropriate
  //  to pass into a `splice` call
  spliceIndex(index: number, array: any[]): number
  {
    if(index === undefined || index === null || index === -1)
    {
      if(Immutable.Iterable.isIterable(array))
      {
        return array['size'];
      }
      return array.length;
    }
    
    return index;
  },
  
  // still needed?
  immutableMove: (arr: any, id: any, index: number) => {
    var curIndex = arr.findIndex((obj) => 
      (typeof obj.get === 'function' && (obj.get('id') === id))
      || (obj.id === id));
    var obj = arr.get(curIndex);
    arr = arr.delete(curIndex);
    return arr.splice(index, 0, obj);
  },
  
  keyPathForId: keyPathForId,

	isInt(num): boolean
	{
		return num === parseInt(num, 10);
	},

	isArray(arr: any): boolean
	{
		return arr.length !== undefined;
	},

	parentNode(reactNode): Node
	{
		return ReactDOM.findDOMNode(reactNode).parentNode;
	},
  
  siblings(reactNode): NodeList
  {
    return Util.parentNode(reactNode).childNodes;
  },
  
  selectText(field, start, end) {
    if( field.createTextRange ) {
      var selRange = field.createTextRange();
      selRange.collapse(true);
      selRange.moveStart('character', start);
      selRange.moveEnd('character', end);
      selRange.select();
      field.focus();
    } else if( field.setSelectionRange ) {
      field.focus();
      field.setSelectionRange(start, end);
    } else if( typeof field.selectionStart != 'undefined' ) {
      field.selectionStart = start;
      field.selectionEnd = end;
      field.focus();
    }
  },

	valueMinMax(value: number, min: number, max: number)
	{
		return Math.min(Math.max(value, min), max);
	},
  
  deeperCloneArr(obj): any
  {
    return _.map(obj, _.clone);
  },
  
  deeperCloneObj(obj): any
  {
    var ans = {}
    _.map(obj, (val, key) => ans[key] = _.clone(val));
    return ans;
  },
  
  animateToHeight(node, height: number, onComplete?): void
  {
    var el = $(node);
    var curHeight = el.height();

    el.css('overflow', 'hidden');
    el.height(curHeight).animate({ height: height }, 250, () => {
      onComplete && onComplete(); 
    }); 
  },
  
  animateToAutoHeight(node, onComplete?, duration?): void
  {
    var el = $(node);
    var curHeight = el.height();
    var autoHeight = el.css('height', 'auto').height();

    el.height(curHeight).animate({ height: autoHeight }, duration || 250, function() {
      el.css('height', 'auto'); 
      el.css('overflow-y', 'visible');
      onComplete && onComplete();
    });
  },
  
  
  bind(component: React.Component<any, any>, ...args: any[])
  {
    var fields: any[] = args;
    if(typeof fields[0] === 'object')
    {
      fields = fields[0];
    }
    
    fields.map((field) => component[field] = component[field].bind(component));
  },
  
  throttle(component: React.Component<any, any>, fields: string[], rate)
  {
    // For throttling methods on a react component
    // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js
    fields.map((field) => {
      component['_throttled_' + field] = _.throttle(component[field], 1000);
      component[field] = (event) => {
        if(event && typeof event.persist === 'function')
        {
          // must call persist to keep the event around
          // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js/24679479#24679479
          event.persist();
        }
        component['_throttled_' + field](event);
      }
    });
  },


  // REMOVE
	// accepts object of key/vals like this: { 'className': include? }
	objToClassname(obj: { [className: string]: boolean }): string
	{
		return _.reduce(obj, (classNameArray: string[], include: boolean, className: string) => {
				if(include)
				{
					classNameArray.unshift(className);
				}
				return classNameArray;
			}, []).join(" ");
	},
  
   
  cardIndex: (cards, action) =>
  {
    return cards.findIndex(card => card.get('id') === action.payload.card.id);
  },

  populateTransformDummyData(transformCard)
  {
    transformCard.range = transformCard.range || [0,100];
    transformCard.bars = transformCard.bars || [];
    transformCard.scorePoints = transformCard.scorePoints || [];
    
    if(transformCard.scorePoints.length === 0)
    {
      for(var i:any = 0; i < 5; i ++)
      {
        transformCard.scorePoints.push(
        {
          value: transformCard.range[0] + (transformCard.range[1] - transformCard.range[0]) / 4 * i,
          score: 0.5,
          id: "p" + i,
        });
      }
    }
  },
};

export default Util;