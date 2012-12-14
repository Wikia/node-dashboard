var BaseProvider = function( settings ) {
	this.subscribers = []; // [ [source, names] ]
	this.settings = settings;
};
BaseProvider.prototype.addSubscriber = function (source, names) {
	this.subscribers.push( [source, names] );
};
BaseProvider.prototype.removeSubscriber = function (source) {
	this.subscribers = this.subscribers.filter( function(e) { return e[0] != source; });
};
BaseProvider.prototype.pushData = function (data) {
	this.subscribers.forEach( function(e)  {
		// todo; filter names
		e[0].addData(data);
	});
};

module.exports = BaseProvider;
