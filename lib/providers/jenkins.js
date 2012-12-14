var BaseProvider = require('./base')
	, util = require('util')
	, http = require('http');

var Jenkins = function(settings) {
	BaseProvider.apply(this,arguments);
	this.providerName = 'Jenkins';
};
util.inherits(Jenkins,BaseProvider);
Jenkins.prototype.sendRequest = function() {
	var path, options,
		self = this, req;

	path = (this.settings.path || '') + '/api/json';
	options = {
		host: this.settings.host,
		path: path
	};
	this.settings.port && (options.port = this.settings.port);
	util.log('[JENKINS] sending request: '+JSON.stringify(options));
	req = http.get(options,function(res){
		res.setEncoding('utf8');
		var str = '';
		res.on('data',function(chunk){
			str += chunk;
		});
		res.on('end',function(){
			self.onDataReceived(JSON.parse(str));
		});
	});
	req.on('error',function(e){
		util.log('[JENKINS] error: ' + e.message);
	});
};
Jenkins.prototype.onDataReceived = function( data ) {
	if ( !data ) return;
	util.log('[JENKINS] got data');
	var now = (new Date()).valueOf(),
		jobs = data.jobs, i, job, out = {},
		jobsFilter = this.settings.jobs;
	if ( !jobs.push ) return; // is not array
	for (i=0;i<jobs.length;i++) {
		job = jobs[i];
		if ( jobsFilter && jobsFilter.indexOf(job.name) == -1 ) continue;
		out[job.name] = [ [ now, job.color == 'blue' ? 1 : 0 ] ];
	}
	this.pushData(out);
};
Jenkins.prototype.start = function() {
	if ( this.started ) return;
	this.started = true;
	var self = this;
	this.sendRequest();
	this.requestInterval = setInterval(function(){
		self.sendRequest();
	},10000); // every 10 seconds
};

module.exports = Jenkins;