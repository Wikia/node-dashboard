var BaseProvider = require('./base')
	, util = require('util');

var Constant = function(settings) {
	BaseProvider.apply(this,arguments);
	this.providerName = 'Constants';
};
util.inherits(Constant,BaseProvider);
Constant.prototype.getData = function() {
	var date = (new Date()).valueOf();
	var result = {};
	var values = this.settings.values;
	for(key in values) {
		result[key] = [ [date, values[key] ] ]
	}
	return result;
};
Constant.prototype.start = function() {
	this.pushData(this.getData()); // push once
};

module.exports = Constant;
