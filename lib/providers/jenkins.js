var HTTPPollProvider = require('./http_poll')
	, util = require('util');

var Jenkins = function(settings) {
	HTTPPollProvider.apply(this,arguments);
	this.providerName = 'Jenkins';
	this.defaults.pathSuffix = '/api/json';
};
util.inherits(Jenkins,HTTPPollProvider);
Jenkins.prototype.parseData = function( data ) {
	var now = (new Date()).valueOf(),
		jobs = data.jobs, i, job, out = {},
		jobsFilter = this.settings.jobs;
	if ( !jobs.push ) return false; // is not array
	for (i=0;i<jobs.length;i++) {
		job = jobs[i];
		if ( jobsFilter && jobsFilter.indexOf(job.name) == -1 ) continue;
		out[job.name] = [ [ now, job.color != 'red' ? 1 : 0 ] ];
	}
	return out;
};

module.exports = Jenkins;