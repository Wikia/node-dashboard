var BaseProvider = require('./base')
	, util = require('util')
	, querystring = require('querystring');

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
	this.field = settings.field;
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
		var now = new Date(), from = new Date(now.valueOf() - 30 * 60 * 1000),
			options = {
				appId: app,
				'metrics[]': this.metrics,
				field: this.field,
				begin: from.toISOString(),
				end: now.toISOString()
			};
		util.log('[NEWRELIC] request: '+JSON.stringify(options));
		this.api.getMetrics( options, callback );
	} else {
		this.api.getSummaryMetrics(app, callback);
	}

};
parseDates = function(metric) {
	var start = new Date(metric.begin_time||metric.begin).valueOf();
	var end = new Date(metric.end_time||metric.end).valueOf();
	return (start+end)/2;
};
NewRelic.prototype.fetched = function (metrics) {
	var out = {},
		self = this, value;
	//util.log(util.inspect(metrics));
	metrics.forEach(function (el) {
		var key = this.field ? this.field : el.name,
			date = parseDates(el),
			value = el[ this.field ? this.field : 'metric_value' ];
		out[key] = out[key] || [];
		//if (self.last[key]===undefined || self.last[key] != date)
		{
			this.last[key] = date;
			value = parseFloat(value);
			if ( !value && value !== 0 ) return;
			out[key].push([date, value]);
		}
	},this);

//	util.log('[] '+JSON.stringify(out));

	this.pushData(out);
};
NewRelic.prototype.fetch = function() {
	this.applications.forEach(this.fetchMetrics, this);
};

module.exports = NewRelic;
