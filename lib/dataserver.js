var util = require('util'),
	Providers = require('./providers'),
	Source = require('./sources').Source;


var DataServer = module.exports = function( settings, io ) {
	this.settings = settings;
	this.io = io;

	this.providers = {};
	this.sources = {};
};
exports.dashboard = exports;


DataServer.prototype.services = {

};


DataServer.prototype.getProvider = function( name ) {
	if ( this.providers[name] !== undefined ) {
		return this.providers[name];
	}
	this.providers[name] = false;
	if ( !this.settings.providers[name] ) {
		util.log("[ERROR] Provider "+name+" does not exist!");
		return false;
	}
	var config = this.settings.providers[name]
		, cls = config.type;
	if ( !Providers[cls] ) {
		util.log("[ERROR] Provider "+name+" has invalid type: "+cls+"!");
		return false;
	}
	var provider = new Providers[cls](config);
	this.providers[name] = provider;
	return provider;
};

DataServer.prototype.getSource = function( name ) {
	if ( this.sources[name] !== undefined ) {
		return this.sources[name];
	}
	this.sources[name] = false;
	if ( !this.settings.sources[name] ) {
		util.log("[ERROR] Source "+name+" does not exist!");
		return false;
	}
	var config = this.settings.sources[name]
		, provider = this.getProvider(config.provider);
	if ( !provider ) {
		util.log("[ERROR] Source "+name+" has invalid provider: "+config.provider+"!");
		return false;
	}
	var source = new Source(config);
	provider.addSubscriber(config.data,source);
	this.sources[name] = source;
	return source;
};

DataServer.prototype.run = function() {
	var settings = this.settings,
		provider, source, name;
	// TODO: create sources and providers
	for (name in settings.providers) {
		this.getProvider(name);
	}
	for (name in settings.sources) {
		this.getSource(name);
	}

	// bind to socket.io connections
	this.io.sockets.on('connection', this.proxy(this.onConnect));
};

DataServer.prototype.proxy = function(fn) {
	var self = this;
	return function() {
		fn.apply(self,arguments);
	}
};

DataServer.prototype.onConnect = function( socket ) {
	var services = this.services,
		self = this;
	for (var i in services) {
		socket.on(i,(function(fn){
			return function(data){
				fn.call(self,socket,data);
			}
		})(services[i]));
	}
};


