var BaseProvider = require('./base')
	, util = require('util')
	, https = require('https')

var NewRelic = function(settings) {
	BaseProvider.apply(this,arguments);
	this.providerName = 'NewRelic';
	this.apiKey = settings.apiKey;
	this.accountId = settings.accountId;
	this.applications = settings.applications;

};
util.inherits(NewRelic,BaseProvider);
NewRelic.prototype.getData = function() {
  /*	var date = (new Date()).valueOf();
	var result = {};
	var values = this.settings.values;
	for(key in values) {
		result[key] = [ [date, values[key] ] ]
	}
	*/
	return result;
};
NewRelic.prototype.start = function() {
	/*
	this.pushData(this.getData()); // push once
	*/
};
NewRelic.prototype.apiOptions = function() {
	return {
		hostname: 'api.newrelic.com',
		port: 443,
		method: 'GET',
		path: '/api/v1/accounts/'+this.accountId+'/',
		headers: { 'x-api-key': this.apiKey }
	}
}
NewRelic.prototype.fetchApplications = function(cb) {
	var options = this.apiOptions();
	options.path = options.path + 'applications.json';
	var data = '';
	var req = https.request(options, function(res) {
		res.on('data', function (d) { data += d; });
		res.on('end', function() { cb(data); });
	});
	req.on('error', util.log)
	req.end()

}

module.exports = NewRelic;
