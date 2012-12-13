exports.singleSource = function(provider) {
	var source = {
		providerNames: [provider.name],
		data: [],
		getVariableNames: function() {
				
		},
		getData: function(from, to) {
	
			
		},
		trim: function(to) {
				
		}
		
	};
	return source;
};



exports.constantProvider = function(values) {
	var provider = {
		providerName: 'Constants',
		getDataPoint: function (date) {
			return values;
		},
		variableNames: function() {
			return Object.keys(values);			
		}
	}
	return provider;
};

exports.Source = exports.singleSource;