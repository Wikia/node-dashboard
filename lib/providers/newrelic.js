var BaseProvider = require('./base')
	, util = require('util');

var NewRelicApi = require('newrelicapi');

var NewRelic = function(settings) {
	BaseProvider.apply(this,arguments);
	this.providerName = 'NewRelic';
	this.last = {};
	this.apiConfig = {
		apikey: settings.apiKey,
		accountId: settings.accountId
	};
	this.api = new NewRelicApi(this.apiConfig);
	this.applications = settings.applications;
	this.interval = settings.interval || 30000;
};
util.inherits(NewRelic,BaseProvider);
NewRelic.prototype.start = function() {
	if ( this.started ) return;
	this.started = true;
	this.fetch();
	this.requestInterval = setInterval(this.fetch, this.interval);
};
NewRelic.prototype.fetchApplications = function(cb, err) {
	this.api.getApplications(function (e, result) {
		if (err) err(e); else cb(result);
	});
}
NewRelic.prototype.fetchMetrics = function(app) {
	var self = this;
	this.api.getSummaryMetrics(app, function (e, result) {
		if (e) util.log(e); else self.fetched(result);
	});
}
parseDates = function(metric) {
	var start = new Date(metric.begin_time).valueOf();
	var end = new Date(metric.end_time).valueOf();
	return (start+end)/2;
}
NewRelic.prototype.fetched = function (metrics) {
	var newData = {};
	var self = this;
	metrics.forEach(function (el) {
		var key = el.name;
		var date = parseDates(el);
		if (self.last[key]===undefined || self.last[key] != date)
		{
			self.last[key] = date;
			newData[key] = [ [date, el.metric_value] ];
		}
	});
	this.pushData(newData);
}
NewRelic.prototype.fetch = function() {
	this.applications.forEach(this.fetchMetrics, this);
}

module.exports = NewRelic;
