var BaseProvider = require('./base')
	, util = require('util');

var Random = function(settings) {
	BaseProvider.apply(this,arguments);
	this.providerName = 'Random';
};
util.inherits(Random,BaseProvider);
Random.prototype.getData = function() {
	var date = (new Date()).valueOf(),
		result = {}, key,
		values = this.settings.values;
	for (key in values) {
		var min = values[key].min || 0,
			max = values[key].max || 10,
			val = Math.floor(Math.random()*(max-min)) + min;
		result[key] = [ [date, val ] ]
	}
	return result;
};
Random.prototype.start = function() {
	var self = this;
	this.pushData(this.getData()); // push once
	setInterval(function(){
		self.pushData(self.getData());
	},1000);
};

module.exports = Random;