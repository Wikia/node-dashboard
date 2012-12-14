var util = require('util')
	, events = require('events');

var Source = function(config) {
	events.EventEmitter.call(this);

	this.config = config || {};
	this.keepHistoryFor = this.config.keepHistoryFor;
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
	this.latest = new Date().valueOf(); // get max values from series instead?
	if (this.earliest === undefined) {
		this.earliest = this.latest;
	}
	if (this.keepHistoryFor !== undefined && this.earliest + this.keepHistoryFor < this.latest) {
		this.discardOlder(this.latest - this.keepHistoryFor);
	}
	this.emit('update',this);
};
Source.prototype.cleanSeries = function(name) {
	var old = this.series[name],
		series, last, i;
	// sort data by time
	old.sort(function(a,b){
		return a[0]-b[0];
	});
	// remove duplicated entries
	series = [];
	for (i=0;i<old.length;i++) {
		if ( old[i][0] !== last ) {
			series.push(old[i]);
		}
	}
	this.series[name] = series;
};
Source.prototype.discardOlder = function(timestamp) {
	for (key in this.series) {
		arr = this.series[key];
		this.series[key] = arr.filter(function (e) { return e[0] >= timestamp; });
	}
	this.earliest = timestamp;
};

exports.Source = Source;
