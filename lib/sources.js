exports.Source = function() {
	var source = {
		series: {},
		names: [],
		getNames: function() { return names; },
		getDateFilter: function(from, to) {
			// todo
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
			// todo: dropping old data
		}
	};
	return source;
};


baseProvider = function() {
	var provider = {
		subscribers: [], // [ [source, names] ]
		addSubscriber: function (source, names) {
			this.subscribers.push( [source, names] );
			// todo: get and add history data
		},
		removeSubscriber: function (source) {
			this.subscribers = this.subscribers.filter( function(e) { return e[0] != source; });
		},
		pushData: function (data) {
			this.subscribers.forEach( function(e)  {
				// todo; filter names
				e[0].addData(data);
			});
		}
	};
	return provider;
}

exports.constantProvider = function(values) {

	var provider = baseProvider();
	provider.providerName = 'Constants';
	provider.getData = function() {
		var date = new Date().valueOf();
		var result = {};
		for(key in values) {
			result[key] = [ [date, values[key] ] ]
		}
		return result;
	}
	provider.start = function() {
		this.pushData(this.getData()); // push once
	}
	return provider;
};

