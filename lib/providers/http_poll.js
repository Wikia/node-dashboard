var BaseProvider = require('./base')
	, util = require('util')
	, http = require('http')
	, querystring = require('querystring');

var HTTPPollProvider = function(settings) {
	BaseProvider.apply(this,arguments);
	this.providerName = 'HTTPPoll';
	this.defaults = {
		interval: 10000,
		pathSuffix: ''
	};
};
util.inherits(HTTPPollProvider,BaseProvider);
HTTPPollProvider.prototype.getGetParameters = function() {
	return false;
};
HTTPPollProvider.prototype.log = function( str ) {
	util.log('['+this.providerName+'] '+str);
};
HTTPPollProvider.prototype.sendRequest = function() {
	var options = {}, path, params = this.getGetParameters(),
		self = this, req;

	// set default options
	options.host = this.settings.host;
	this.settings.port && (options.port = this.settings.port);

	// build path
	path = this.settings.path || '/';
	path += this.settings.pathSuffix || this.defaults.pathSuffix || '';
	path +=
		typeof params == 'object' ? ('?' + querystring.stringify(params)) :
		typeof params == 'string' ? ('?' + params) : '';
	options.path = path;

	this.log('sending request: '+JSON.stringify(options));
	req = http.get(options,function(res){
		res.setEncoding('utf8');
		var str = '';
		res.on('data',function(chunk){
			str += chunk;
		});
		res.on('end',function(){
			var data;
			try {
				data = JSON.parse(str);
			} catch (e) {
				return;
			}
			self.onDataReceived(data);
		});
	});
	req.on('error',function(e){
		self.log('error: ' + e.message);
	});
};
HTTPPollProvider.prototype.onDataReceived = function( data ) {
	if ( !data ) return;
	this.log('got data');
	var out = this.parseData(data);
	this.pushData(out);
};
HTTPPollProvider.prototype.start = function() {
	if ( this.started ) return;
	this.started = true;
	var self = this;
	this.sendRequest();
	this.requestInterval = setInterval(function(){
		self.sendRequest();
	},this.settings.interval || this.defaults.interval); // every 10 seconds
};

module.exports = HTTPPollProvider;