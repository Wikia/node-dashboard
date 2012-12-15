var util = require('util');

function isPlainObject(o) {
	return o.prototype === ({}).prototype;
}

function extend(dest,obj) {
	var i;
	for (i in obj) {
		dest[i] = obj[i];
	}
	return dest;
}

function applyTemplates( obj, templates ) {
	if ( typeof obj != 'object' ) return;
	if ( obj.push ) return;
	var copy, use, i;
	if ( obj.use ) {
		copy = extend({},obj);
		use = obj.use;
		if ( typeof use == 'string' ) {
			use = use.split(' ');
		}
		for (i=0;i<use.length;i++) {
			if ( templates[use[i]] ) {
				extend(obj,templates[use[i]]);
			}
		}
		extend(obj,copy);
		delete obj.use;
	}
}

exports.expand = function( config ) {
	var templates = config.templates || {},
		i, j, list;

	// apply templates to layouts
	if ( typeof config.layouts == 'object' ) {
		for (i in config.layouts) {
			list = config.layouts[i];
			for (j=0;j<list.length;j++) {
				applyTemplates(list[j],templates);
			}
		}
	}

	util.log(JSON.stringify(config.layouts.testLayout[0]));
	return config;
}