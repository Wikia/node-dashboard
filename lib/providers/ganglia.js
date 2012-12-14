var BaseProvider = require('./base')
	, util = require('util')
	, http = require('http')
	, querystring = require('querystring');

var Ganglia = function(settings) {
	BaseProvider.apply(this,arguments);
	this.providerName = 'Ganglia';
};
util.inherits(Ganglia,BaseProvider);
Ganglia.prototype.sendRequest = function() {
	var path, options, params = {}, url,
		self = this, req;
	params.r = 'hour';
	if ( this.settings.cluster ) {
		params.c = this.settings.cluster;
	}
	if ( this.settings.metric ) {
		params.g = this.settings.metric;
	}
	params.json = 1;

	path = this.settings.path + '/graph.php?' + querystring.stringify(params);
	options = {
		host: this.settings.host,
		path: path
	};
	util.log('[GANGLIA] sending request: '+JSON.stringify(options));
	req = http.get(options,function(res){
//		util.log('[GANGLIA] got headers: '+JSON.stringify(res));
		res.setEncoding('utf8');
		var str = '';
		res.on('data',function(chunk){
//			util.log('[GANGLIA] got chunk: '+chunk);
			str += chunk;
		});
		res.on('end',function(){
//			util.log('[GANGLIA] data received: '+str);
			self.onDataReceived(JSON.parse(str));
		});
	});
	req.on('error',function(e){
		util.log('[GANGLIA] error: ' + e.message);
	});
};
Ganglia.prototype.onDataReceived = function( data ) {
	if ( !data ) return;
	util.log('[GANGLIA] got data');
	var i, j, item, out = {}, itemData;
	for (i=0;i<data.length;i++) {
		item = data[i];
		itemData = [];
		for (j=0;j<item.datapoints.length;j++) {
			itemData.push([
				item.datapoints[j][1] * 1000, // timestamps in js are in ms
				item.datapoints[j][0]
			]);
		}
		out[item.ds_name] = itemData;
	}
	this.pushData(out);
};
Ganglia.prototype.start = function() {
	if ( this.started ) return;
	this.started = true;
	var self = this;
	this.sendRequest();
	this.requestInterval = setInterval(function(){
		self.sendRequest();
	},10000); // every 10 seconds
};

module.exports = Ganglia;