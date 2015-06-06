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

var terrainControllers = angular.module('terrainControllers', []);

function selectPage(page) {
	$(".nav li").removeClass('active');
	page = page || location.hash;
	$(".nav li a[href='"+page+"']").parent().addClass('active');
}

terrainControllers.controller('BuilderCtrl', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {
	selectPage('#/builder');
	$scope.abConfig = $routeParams.abConfig;
	$scope.ab = function(exp) {
		if($scope.abConfig && $scope.abConfig.indexOf(exp) != -1)
			return true;
		return false;
	}

	$scope.colorIndex = 0;
	$scope.getColor = function() {
		return CARD_COLORS[$scope.colorIndex ++];
	}

	$scope.cardForKey = function(key) {
		return $scope.getAllCards().reduce(function(card, candidate) {
			if(candidate.key === key)
				return candidate;
			return card;
		}, null);
	}

	$scope.addRawScoreToCardWithKey = function(key, score) {
		// there must be a better way to do this
		var card = $scope.cardForKey(key);
		if(!card) { console.log('ERROR adding raw score to nonexistent card'); return; }
		card.data.raw = card.data.raw || [];
      	card.data.raw.push(score);
	}

	$scope.search = {
		lat: 37.782,
		long: -122.438
	};

	$scope.getAllCards = function() {
		// silly design decision. TODO make the cards as one variable and adjust accordingly
		return $scope.cards.concat($scope.newCards);
	}

	$http.get('assets/ajax/airbnb.json').success(function(response) {
      	$scope.results = response.data;
      	$.each($scope.results, function(index) {
      		var result = this;

      		/* Locations */
      		var locScore = latLongToDistance(this.lat, this.long, $scope.search.lat, $scope.search.long); //Math.pow(this.lat - $scope.search.lat, 2) + Math.pow(this.long - $scope.search.long, 2);
      		// TODO make sense of the ridiculous number of different location types
      		var locationKeys = ['location', 'location_map', 'location_radius', 'location_mapradius', 'location_latlong'];
      		$.each(locationKeys, function(i,key) {
      			result[key] = locScore;
      			$scope.addRawScoreToCardWithKey(key, locScore);
      		});

      		/* add any more calculated result values here, as they come up, if they are not pre-calculated in the response */

      		// sooo inefficient omg omg
      		$.each($scope.getAllCards(), function() {
      			var card = this;
      			if(card.inDataResponse) {
      				$scope.addRawScoreToCardWithKey(card.key, result[card.key]);
      			}
      		});
      	});

    });

	$scope.spotlightColors = ['#67b7ff', '#67ffb7', '#ffb767', '#ff67b7', '#b7ff67', '#b767ff'];
	$scope.spotlightLabels = ["1","2","3","4","5","6"];
	$scope.spotlightToggle = function(result) {
		if(result.spotlight) {
			result.spotlight = false;
			$scope.spotlightColors.push(result.spotlightColor);
			$scope.spotlightLabels.splice(0,0,result.spotlightLabel);
		} else {
			if($scope.spotlightColors.length > 0) {
				result.spotlight = true;
				result.spotlightColor = $scope.spotlightColors.splice(0,1)[0];
				result.spotlightLabel = $scope.spotlightLabels.splice(0,1)[0];
			} else {
				alert('Maximum number of spotlights added.')
			}
		}

		$.each($scope.cards, function(cardIndex, card) {
			card.data.spotlights = [];
			$.each($scope.results, function(resultIndex, result) {
				if(result.spotlight) {
					card.data.spotlights.push({
						rawValue: result[card.key],
						label: result.spotlightLabel,
						color: result.spotlightColor
					});
				}
			});
		});
	}

	$scope.cards = [{
		id: 1,
		name: 'Price',
		key: 'price',
		inDataResponse: true,
		color: $scope.getColor(),
		data: {
			// labels: ["$0", "$50", "$100", "$150", "$200", "$250", "$300", "$350", "$400", ">$400"],
			// bars: [0.44,0.65,1.0,0.58,0.68,0.38,0.24,0.12,0.22],
			xLabelFormat: function(i, value, isMaxpoint) {
				return (isMaxpoint ? "> " : "") + "$" + (Math.floor(value));
			},
			domain: [0,400, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
			numberOfBars: 9,
			barRange: [0,20],
			points: [0.64, 0.67, 0.90, 1, 0.3599999999999999].reverse(),
			// points: 5,
			pointRange: [0,1],
			barToPointRatio: 2
		},
		weight: 50,
		newCardIsShowing: false,
		showing: true
	}, {
		id: 0,
		name: 'Location',
		key: 'location',
		color: $scope.getColor(),
		data: {
			// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
			// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
			xLabelFormat: function(i, value, isMaxpoint) {
				return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
			},
			domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
			numberOfBars: 9,
			barRange: [0,20],
			points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
			// points: 5,
			pointRange: [0,1],
			barToPointRatio: 2
		},
		weight: 50,
		newCardIsShowing: true,
		showing: true
	}];

	$scope.newCards = [
		{
			id: 2,
			name: 'Average Rating',
			key: 'rating',
			inDataResponse: true,
			data: {
				// labels: ["0 Stars", "1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"],
				// bars: [0.44,0.65,1.0,0.58,0.68],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (value) + " Stars";
				},
				domain: [0,5, false], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 5,
				barRange: [0,40],
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999].reverse(),
				pointRange: [0,1],
				barToPointRatio: 1
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		},
		{
			name: 'Number of Bedrooms',
			key: 'bedrooms',
			inDataResponse: true,
			id: 4,
			data: {
				// labels: ["0", "1", "2", "3", "4+"],
				// bars: [0.27, 0.87, 1, 0.47, 0.17],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value));
				},
				domain: [0,3, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 4,
				barRange: [0,20],
				points: [0.75, 0.75, 0.75, 0.75],
				pointRange: [0,1],
				barToPointRatio: 1
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			name: 'Number of Stays',
			key: 'stays',
			inDataResponse: true,
			id: 5,
			data: {
				// labels: ["0", "10", "25", "100", "250", "1000", "2500", ">2500"],
				// bars: [0.37, 0.47, 1, 0.87, 0.47, 0.27, 0.17],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value));
				},
				domain: [0,200, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.64].reverse(),
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			name: 'Number of Reviews',
			key: 'reviews',
			inDataResponse: true,
			id: 6,
			data: {
				// labels: ["0", "10", "25", "100", "250", "1000", "2500", ">2500"],
				// bars: [0.47, 0.87, 1, 0.97, 0.39, 0.32, 0.12],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value));
				},
				domain: [0,100, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [0.4, 0.4, 0.6, 0.8, 1],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			id: 7,
			name: 'Location (Map)',
			key: 'location_map',
			data: {
				// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 8,
			name: 'Location (MapRadius)',
			key: 'location_mapradius',
			data: {
				// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 9,
			name: 'Location (Radius)',
			key: 'location_radius',
			data: {
				// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 10,
			name: 'Location (LatLong)',
			key: 'location_latlong',
			data: {
				// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}
	];

	$scope.addCard = function(cardToAdd, cardToAddInFrontOf) {
		var addAtEnd = false;
		if(cardToAddInFrontOf == null) {
			var addAtEnd = true;
			cardToAddInFrontOf
		}

		var cardToSubtractWeightFrom = cardToAddInFrontOf;
		while(cardToSubtractWeightFrom && cardToSubtractWeightFrom.weight < 2 * cardToAdd.weight)
			cardToSubtractWeightFrom = $scope.cards[$scope.cards.indexOf(cardToSubtractWeightFrom) + 1];
		if(!cardToSubtractWeightFrom) {
			cardToSubtractWeightFrom = cardToAddInFrontOf;
			while(cardToSubtractWeightFrom && cardToSubtractWeightFrom.weight < 2 * cardToAdd.weight)
				cardToSubtractWeightFrom = $scope.cards[$scope.cards.indexOf(cardToSubtractWeightFrom) - 1];
			if(!cardToSubtractWeightFrom) {
				alert("There's no more space for a new card right now.");
				return;
			}
		}

		cardToSubtractWeightFrom.weight -= cardToAdd.weight;
		cardToAdd.color = $scope.getColor();
		$scope.cards.splice($scope.cards.indexOf(cardToAddInFrontOf), 0, cardToAdd);
			cardToAddInFrontOf.newCardIsShowing = false;
		if($scope.newCards.indexOf(cardToAdd) != -1)
			$scope.newCards.splice($scope.newCards.indexOf(cardToAdd), 1);
		// if($scope.cards.indexOf(cardToAdd) == 0)
		// 	cardToAdd.newCardIsShowing = true;
	}

	$scope.addCardAndApply = function(cardToAdd, cardToAddInFrontOf) {
		$scope.addCard(cardToAdd, cardToAddInFrontOf);
		$scope.$apply();
	}

	$scope.newCardIsShowing = function() {
		if(arguments.length == 2) {
			arguments[0].newCardIsShowing = arguments[1];
		}
		return arguments[0].newCardIsShowing;
	}

	$scope.handleChange = function(cardId) {
		$scope.$apply();
	}

	$scope.scoreForResult = function(result) {
		var total = 0;
		$.each($scope.cards, function(index, card) {
			var data = card.data;

			// TODO replace by a better bucket getter if you redo buckets
			var bucketStart = data.domain[0];
			var bucketEnd = data.domain[1];
			var bucketSize = (bucketEnd - bucketStart) / data.numberOfBars;
			var bucket = 0;
			while(result[card.key] > bucketStart + bucketSize * bucket && bucket < data.numberOfBars) bucket ++;
			bucket --; // we overshot it

			var pointValue = (data.points[Math.floor(bucket / data.barToPointRatio)] + data.points[Math.ceil(bucket / data.barToPointRatio)]) / 2;
			total += pointValue * card.weight / 100;
		});
		return total; 
	}

	$scope.scoreForResultDisplay = function(result) {
		var score = Math.floor($scope.scoreForResult(result) * 1000) / 1000;
		if(score == 1) return "1.00";
		score = ("" + score).substr(1);
		while(score.length < 4) score = score + "0";
		return score;
	}

	$scope.scoreForResultSort = function(result) {
		// sorts low to hi and doesn't seem like you can control it from the template
		return -1 * $scope.scoreForResult(result);
	}
}]);

terrainControllers.controller('PlaceholderCtrl', ['$scope', '$routeParams', function($scope, $routeParams) {
	$scope.page = window.location.hash.substr(2);
	selectPage();
}]);