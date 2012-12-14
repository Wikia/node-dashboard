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
	this.metrics = settings.metrics;
};
util.inherits(NewRelic,BaseProvider);
NewRelic.prototype.start = function() {
	if ( this.started ) return;
	var self = this;
	this.started = true;
	this.fetch();
	this.requestInterval = setInterval(function () { self.fetch(); }, this.interval);
};
NewRelic.prototype.fetchApplications = function(cb, err) {
	this.api.getApplications(function (e, result) {
		if (err) err(e); else cb(result);
	});
};
NewRelic.prototype.fetchMetrics = function(app) {
	var self = this;
	var callback = function (e, result) {
		if (e) {
			util.log('[NEWRELIC] e: ' + e);
		} else if (result.error) {
			util.log('[NEWRELIC] error: ' + result.error);
		} else {
//			util.log('[NEWRELIC] data: ' + JSON.stringify(result));
			self.fetched(result);
		}
	};
	if (this.metrics) {
		this.api.getMetrics( {appId: app, metrics:this.metrics}, callback)
	} else {
		this.api.getSummaryMetrics(app, callback);
	}

};
parseDates = function(metric) {
	var start = new Date(metric.begin_time).valueOf();
	var end = new Date(metric.end_time).valueOf();
	return (start+end)/2;
};
NewRelic.prototype.fetched = function (metrics) {
	var newData = {},
		self = this, value;
	//util.log(util.inspect(metrics));
	metrics.forEach(function (el) {
		var key = el.name;
		var date = parseDates(el);
		//if (self.last[key]===undefined || self.last[key] != date)
		{
			self.last[key] = date;
			value = parseFloat(el.metric_value);
			if ( !value && value !== 0 ) return;
			newData[key] = [ [date, value] ];
		}
	});
	this.pushData(newData);
};
NewRelic.prototype.fetch = function() {
	this.applications.forEach(this.fetchMetrics, this);
};

module.exports = NewRelic;
