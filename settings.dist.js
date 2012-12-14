exports.providers = {
	/*
	NAME : {
		type: PROVIDER_CLASS_NAME,
		OTHER_SETTINGS_FOR_PROVIDER
	}
	*/
	Test1 : {
		type: 'Constant',
		A : 1
	}
};

exports.sources = {
	/*
	NAME : {
		provider: PROVIDER_NAME,
		data: [ SERIES_NAME_LIST ]
	}
	*/
};

exports.layouts = {
	/*
	NAME: [{
		type: WIDGET_CLASS_NAME,
		sources: [ SOURCE_NAMES_TO_GET_DATA_FROM ]
		OTHER_SETTINGS_FOR_WIDGET
	} , ... ]
	*/
};

exports.dashboards = {
	/*
	NAME: {
		items: [ LAYOUT_NAMES_LIST ]
	}
	*/
};
