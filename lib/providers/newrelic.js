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
};
util.inherits(NewRelic,BaseProvider);
NewRelic.prototype.start = function() {
	

	/*
	this.pushData(this.getData()); // push once
	*/
};
NewRelic.prototype.fetchApplications = function(cb, err) {
	this.api.getApplications(function (e, result) {
		if (err) err(e); else cb(result);
	});
}
NewRelic.prototype.fetchMetrics = function(app, cb, err) {
	this.api.getSummaryMetrics(app, function (e, result) {
		if (err) err(e); else cb(result);
	});
}
NewRelic.prototype.parseDates = function(metric) {
	var start = new Date(metric.begin_time).valueOf();
	var end = new Date(metric.end_time).valueOf();
	return (start+end)/2;
}
NewRelic.prototype.fetched = function (metrics) {
	var newData = {}
	metrics.forEach(function (el) {
		var key = el.name;
		var date = parseDates(el);
		if (this.last[key]===undefined || this.last[key] != date)
		{
			this.last[key] = date;
			newData[key] = [ [date, el.metric_value] ];
		}
	});
	this.pushData(newData);
}
NewRelic.prototype.fetch = function() {
	for (app in this.applications) {
		this.fetchMetrics(app, this.fetched, util.log);
	}





}

module.exports = NewRelic;
