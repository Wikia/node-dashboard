exports.default = function() {

};

baseProvider = function() {
	var provider = {
		subscribers: [], // [ [source, names] ]
		addSubscriber: function (source, names) {
			this.subscribers.push( [source, names] );
		},
		removeSubscriber: function (source) {
			this.subscribers = this.subscribers.filter( function(e) { return e[0] != source; });
		},
		pushData: function (data) {
			this.subscribers.forEach( function(e)  {
				// todo; filter names
				e[0].addData(data);
			});
		}
	};
	return provider;
}

exports.Constant = function(settings) {
	var provider = baseProvider();
	provider.providerName = 'Constants';
	provider.getData = function() {
		var date = new Date().valueOf();
		var result = {};
		var values = settings.values;
		for(key in values) {
			result[key] = [ [date, values[key] ] ]
		}
		return result;
	}
	provider.start = function() {
		this.pushData(this.getData()); // push once
	}
	return provider;
};
