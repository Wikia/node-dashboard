var Dashboard = function ( el ) {
	this.el = el;
	this.sources = {};
};
Dashboard.prototype.log = function( msg ) {
	if ( window.console && typeof window.console.log == 'function' ) {
		window.console.log.apply(window.console,arguments);
	}
};

Dashboard.prototype.run = function() {
	var socket = io.connect('//');
	socket.on('update-sources', $.proxy(this.onUpdateData,this));
	socket.on('update-flags', $.proxy(this.onUpdateFlags,this));
	socket.on('update-configuration', $.proxy(this.onConfigure,this));
	/*
	socket.emit('my-other-event',{ my: 'data2' });
	socket.on('news', function (data) {
		console.log(data);
		socket.emit('my other event', { my: 'data' });
	});
	*/
};
Dashboard.prototype.onUpdateData = function( data ) {
	var updateQueue = [], source,
		last, i, widget;
	for ( i in data ) {
		if ( !this.sources[i] ) continue;
		source = this.sources[i];
		source.setData(data)
		updateQueue = updateQueue.concat(source.getWidgets());
	}
	updateQueue.sort();
	for (i=0;i<updateQueue.length;i++) {
		widget = updateQueue[i];
		if ( widget == last ) continue;
		this.updateWidget(widget);
	}
};
Dashboard.prototype.onUpdateFlags = function( data ) {
	this.flags = data.flags;
};
Dashboard.prototype.onConfigure = function( data ) {
	this.layouts = data.layouts;
	this.dashboards = data.dashboards;
	this.flags = data.flags;

};
Dashboard.prototype.getSource = function( name ) {
	if ( !this.sources[name] ) {
		this.sources[name] = new RemoteSource(name,this.socket);
	}
	return this.sources[name];
};
Dashboard.prototype.getWidgetSize = function( value, max ) {
	if ( typeof value == 'number' ) {
		return value;
	}
	var rv;
	if ( typeof value == 'string' && ( rv = /^([0-9.]+)%$/.exec(value) ) ) {
		return Math.floor(parseFloat(rv[1]) * max / 100);
	}
	value = parseFloat(value);
	if ( value < max / 5 ) value = Math.floor(max / 5);
	else if ( value > max ) value = max;
	return Math.floor(value);
};
Dashboard.prototype.getWidgetWidth = function( value ) {
	return this.getWidgetSize(value,this.el.width());
};
Dashboard.prototype.getWidgetHeight = function( value ) {
	return this.getWidgetSize(value,this.el.height());
};

Dashboard.prototype.clearLayout = function() {
	this.widgets = [];
	for (var i in this.sources) {
		this.sources[i].clear();
	}
};
Dashboard.prototype.renderLayout = function( layout ) {
	var i;
	this.clearLayout();
	this.layout = layout;
	for (i=0;i<layout.length;i++) {
		this.createWidget(layout[i]);
	}
	// clean up unused sources
	for (i in this.sources) {
		if ( this.sources[i].getWidgets.length == 0 ) {
			this.sources[i].unsubscribe();
			delete this.sources[i];
		}
	}
};
Dashboard.prototype.createWidget = function( settings ) {
	var cls = this.getWidgetClass(settings.type);
	if ( !cls ) {
		this.log("[ERROR] Widget type is invalid: "+settings.type);
		return;
	}

	var el = $('<div>').appendTo(this.el);

	el.css({
		width: this.getWidgetWidth(settings.width),
		height: this.getWidgetHeight(settings.height)
	});

	// create widget
	var widget = new cls(el,settings),
		i, sources;
	this.widgets.push(widget);
	// assign widget to sources
	sources = widget.getSources();
	for (i=0;i<sources.length;i++) {
		this.getSource(sources[i]).addWidget(widget);
	}
};
Dashboard.prototype.updateWidget = function( widget ) {
	var sources = widget.getSources(),
		i, data = {}, sourceName, source;
	for (i=0;i<sources.length;i++) {
		sourceName = sources[i];
		source = this.sources[sourceName];
		if ( !source ) continue;
		data[sourceName] = source.getData();
	}
	widget.update(data);
};
Dashboard.prototype.getWidgetClass = function( name ) {
	switch (name) {
		case 'chart':
			return ChartWidget;
		default:
			return false;
	}
};

var RemoteSource = function( name, socket ) {
	this.socket = socket;
	this.name = name;
	this.subscribed = false;
	this.data = undefined;
};
RemoteSource.prototype.setData = function( data ) {
	this.data = data;
};
RemoteSource.prototype.getData = function() {
	return this.data;
};
RemoteSource.prototype.subscribe = function() {
	if ( this.subscribed ) return;
	this.subscribed = true;
	this.socket.emit('subscribe-source',{
		source: this.name
	});
};
RemoteSource.prototype.unsubscribe = function() {
	if ( !this.subscribed ) return;
	this.subscribed = false;
	this.socket.emit('unsubscribe-source',{
		source: this.name
	});
};
RemoteSource.prototype.addWidget = function( widget ) {
	if ( this.widgets.indexOf(widget) == -1 ) {
		this.widgets.push(widget);
	}
};
RemoteSource.prototype.clearWidgets = function( widget ) {
	this.widgets = [];
};
RemoteSource.prototype.getWidgets = function() {
	return this.widgets;
};

var ChartWidget = function(el,settings) {
	this.el = el;
	this.sources = settings.sources;
	this.settings = settings;
	this.data = undefined;
};
ChartWidget.prototype.setEl = function( el ) {
	this.el = el;
	this.update(this.data);
};
ChartWidget.prototype.getEl = function() {
	return this.el;
};
ChartWidget.prototype.getSources = function() {
	return this.sources;
};
ChartWidget.prototype.update = function( data ) {
	this.data = data;
	if ( !this.el ) return;
	var series = data.series,
		settings = this.settings;
		options = {
			xaxis: {},
			yaxis: {}
		};
	// set default options
	setIf( options.xaxis, 'timeMode', 'local' );
	// set customizable options
	setIf( options,       'title',    settings.title );
	setIf( options.xaxis, 'title',    settings.xtitle );
	setIf( options.yaxis, 'title',    settings.ytitle );
	setIf( options.yaxis, 'min',      settings.min );
	setIf( options.yaxis, 'max',      settings.max );
	Flotr.draw(this.el,series,options);
};

function setIf( o, property, value ) {
	if ( value !== undefined ) {
		o[property] = value;
	}
}

var dashboard = new Dashboard();
dashboard.run($('body'));
