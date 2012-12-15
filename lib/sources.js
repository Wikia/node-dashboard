var util = require('util')
	, events = require('events');

var Source = function(config) {
	events.EventEmitter.call(this);
	this.config = config || {};
	this.maxHistory = (this.config.maxHistory || 1800) * 1000;
	this.series = {};
	this.names = [];
};
util.inherits(Source,events.EventEmitter);

Source.prototype.getNames = function() {
	return this.names;
};
Source.prototype.getDateFilter = function(from, to) {
	return function(arr) {
		return arr.filter( function (e) {
			return (from === undefined || from<=e[1]) && (to===undefined || el>=e[1]);
		});
	};
};
Source.prototype.getNamesFilter = function(names, dateFilter) {
	return function(data) {
		var result = {};
		for(key in data) {
			if (names === undefined || names.indexOf(key) != -1) {
				result[key] = dateFilter(data[key]);
			}
		}
		return result;
	};
};
Source.prototype.getSeries = function(names,from, to) {
	return this.getNamesFilter(names, this.getDateFilter(from, to))(this.series);
};
Source.prototype.getLast = function(names) {
	return this.getNamesFilter(names, function (arr) { return arr[arr.length-1][1]; })(this.series);
};
Source.prototype.addData = function(data) {
	Object.keys(data).forEach( function (e) {
		if (this.names.indexOf(e) == -1) {
			this.names.push(e);
			this.series[e] = [];
		}
		this.series[e] = this.series[e].concat(data[e]);
		this.cleanSeries(e);
	}, this);
	this.emit('update',this);
};
Source.prototype.cleanSeries = function(name) {
	var old = this.series[name],
		series, last, i, boundary = (new Date().valueOf()) - this.maxHistory;
	old = old.filter(function(e){ return e[0] >= boundary; });
	// sort data by time
	old.sort(function(a,b){
		return a[0]-b[0];
	});
	// remove duplicated entries
	series = [];
	for (i=0;i<old.length;i++) {
		if ( old[i][0] !== last ) {
			series.push(old[i]);
			last = old[i][0];
		}
	}
	this.series[name] = series;
};

exports.Source = Source;
