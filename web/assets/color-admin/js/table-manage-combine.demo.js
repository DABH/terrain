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

/*   
Template Name: Color Admin - Responsive Admin Dashboard Template build with Twitter Bootstrap 3.3.2
Version: 1.6.0
Author: Sean Ngu
Website: http://www.seantheme.com/color-admin-v1.6/admin/
*/

var handleDataTableCombinationSetting = function() {
	"use strict";
    
    if ($('#data-table').length !== 0) {
        if ($(window).width() >= 767) {
            var table = $('#data-table').DataTable({
                ajax:           "assets/plugins/DataTables/json/scroller-demo.json",
                dom: 'TRC<"clear">lfrtip',
                tableTools: {
                    "sSwfPath": "assets/plugins/DataTables/swf/copy_csv_xls_pdf.swf"
                },
                "lengthMenu": [20, 40, 60]
            });
            new $.fn.dataTable.FixedHeader(table);
            new $.fn.dataTable.KeyTable(table);
            new $.fn.dataTable.AutoFill(table, {
                mode: 'both',
                complete: function ( altered ) {
                    var last = altered[ altered.length-1 ];
    
                    $.gritter.add({
                        title: 'Table Column Updated <i class="fa fa-check-circle text-success m-l-3"></i>',
                        text: altered.length+' cells were altered in this auto-fill. The value of the last cell altered was: <span class="text-white">'+last.oldValue+'</span> and is now <span class="text-white">'+last.newValue+'</span>',
                        sticky: true,
                        time: '',
                        class_name: 'my-sticky-class'
                    });
                }
            });
        } else {
            var table = $('#data-table').DataTable({
                ajax:           "assets/plugins/DataTables/json/scroller-demo.json",
                dom: '<"clear">frtip',
                "lengthMenu": [20, 40, 60]
            });
        }
    }
};

var TableManageCombine = function () {
	"use strict";
    return {
        //main function
        init: function () {
            handleDataTableCombinationSetting();
        }
    };
}();