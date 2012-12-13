exports.Source = function(config) {
	config = config || {};
	var source = {
		keepHistoryFor: config.keepHistoryFor,
		series: {},
		names: [],
		getNames: function() { return names; },
		getDateFilter: function(from, to) {
			return function(arr) {
				return arr.filter( function (e) {
					return (from === undefined || from<=e[1]) && (to===undefined || el>=e[1]);
				});
			};
		},
		getNamesFilter: function(names, dateFilter) {
			if (names === undefined)
				return function(data) {
					var result = {};
					for(key in data) {
						result[key] = dateFilter(data[key]);
					}
					return result;
				};
			else
			  return function(data) {
					var result = {};
					for(key in data) {
						if (names.indexOf(key) != -1) result[key] = dateFilter(data[key]);
					}
					return result;
				};
		},
		getSeries: function(names,from, to) {
			return this.getNamesFilter(names, this.getDateFilter(from, to))(this.series);
		},
		getLast: function(names) {
			return this.getNamesFilter(names, function (arr) { return arr[arr.length-1][1]; })(this.series);
		},
		addData: function(data) {
			Object.keys(data).forEach( function (e) {
				if (this.names.indexOf(e) == -1)  { this.names.push(e); this.series[e] = []; }
				this.series[e] = this.series[e].concat(data[e]);
			}, this);
			this.latest = new Date().valueOf(); // get max values from series instead?
			if (this.earliest === undefined) this.earliest = this.latest;
			if (this.keepHistoryFor !== undefined && this.earliest + this.keepHistoryFor < this.latest) this.discardOlder(this.latest - this.keepHistoryFor);
		},
		discardOlder: function(timestamp) {
			for (key in this.series)
			{
				arr = this.series[key];
				this.series[key] = arr.filter(function (e) { return e[0] >= timestamp; });
			}
			this.earliest = timestamp;
		}
	};
	return source;
};

