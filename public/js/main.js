window.util = {
	inherits: function(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
	}
};

var Dashboard = function ( el ) {
	this.el = el;
	this.sources = {};
	this.switcher = new LayoutSwitcher(this);

	var self = this;
	$(window).resize($.proxy(this.onWindowResize,this));
};
Dashboard.prototype.log = function( msg ) {
	if ( window.console && typeof window.console.log == 'function' ) {
		window.console.log.apply(window.console,arguments);
	}
};

Dashboard.prototype.run = function() {
	var socket = this.socket = io.connect('//');
	socket.on('update-sources', $.proxy(this.onUpdateData,this));
	socket.on('update-flags', $.proxy(this.onUpdateFlags,this));
	socket.on('update-configuration', $.proxy(this.onConfigure,this));
	socket.on('connect', $.proxy(this.onConnect,this));
};
Dashboard.prototype.onUpdateData = function( data ) {
	var updateQueue = [], source,
		last, i, widget;
	this.log('Got data',data);
	for ( i in data ) {
		if ( !this.sources[i] ) continue;
		source = this.sources[i];
		source.setData(data[i])
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
	this.switcher.setFlags(data.flags);
};
Dashboard.prototype.onConfigure = function( data ) {
	this.log('Got configuration',data);
	this.switcher.setSettings(data);
};
Dashboard.prototype.onConnect = function() {
	var i;
	for (i in this.sources) {
		this.sources[i].reset();
	}
};
Dashboard.prototype.onWindowResize = function() {
	var self = this;
	clearTimeout(this.resizeTimeout);
	this.resizeTimeout = setTimeout(function(){
		self.resizeTimeout = false;
		self.switcher.repaint();
	},100);
};
Dashboard.prototype.getSource = function( name ) {
	return this.sources[name]
		|| (this.sources[name] = new RemoteSource(name,this.socket));
};
Dashboard.prototype.registerWidget = function( widget ) {
	var sources = widget.getSources();
	for (var i=0;i<sources.length;i++) {
		this.getSource(sources[i]).addWidget(widget);
	}
	this.updateWidget(widget);
};
Dashboard.prototype.unregisterWidget = function( widget ) {
	var sources = widget.getSources();
	for (var i=0;i<sources.length;i++) {
		this.getSource(sources[i]).removeWidget(widget);
	}
};
Dashboard.prototype.updateWidget = function( widget ) {
	var sources = widget.getSources(),
		i, data = {}, sourceName, source,
		sourceData;
	for (i=0;i<sources.length;i++) {
		sourceName = sources[i];
		source = this.sources[sourceName];
		if ( !source ) continue;
		sourceData = source.getData();
		if ( !sourceData ) {
			// don't update the widget if some data is missing
			return;
		}
		data[sourceName] = sourceData;
	}
	widget.update(data);
};

var LayoutSwitcher = function( client ) {
	this.LAYOUT_CYCLE_LENGTH = 10 * 1000; // 10 seconds
	this.client = client;
	this.updated = false;
	this.settings = undefined;
	this.currentDashboard = undefined;
	this.currentLayout = undefined;
	this.current = undefined;
	this.next = undefined;

	setInterval($.proxy(this.work,this),1000);
};
LayoutSwitcher.prototype.setSettings = function( settings ) {
	clearTimeout(this.updateTimeout);
	this.currentDashboard = false;
	this.updated = false;
	this.settings = settings;
	this.flags = settings.flags;
	this.work();
};
LayoutSwitcher.prototype.setFlags = function( flags ) {
	this.flags = flags;
	this.work();
};
LayoutSwitcher.prototype.work = function() {
	if ( !this.settings ) return;
	var now = (new Date).valueOf(),
		self = this,
		layoutName;
	// @todo: support more than 1 dashboard
	if ( !this.currentDashboard ) {
		// @todo: don't hardcode dashboard name
		this.currentDashboard = this.settings.dashboards.xxy;
		this.currentLayout = -1;
	}
	if ( !this.updated ) {
		this.current && this.current.disable();
		this.next && this.next.disable();
		this.current = false;
		this.next = false;
	}
	if ( !this.updated || this.updated < now - this.LAYOUT_CYCLE_LENGTH ) {
		this.updated = now;
		this.next && this.next.disable();
		this.currentLayout = (this.currentLayout + 1) % this.currentDashboard.items.length;
		layoutName = this.currentDashboard.items[this.currentLayout];
		this.next = this.createLayout(layoutName)
		this.client.log('Preparing layout',layoutName);
		this.next.enable();
		if ( this.current ) {
			this.updateTimeout = setTimeout(function(){
				self.current.disable();
				self.current = self.next;
				self.next = undefined;
				self.current.show();
				self.client.log('Activated layout',self.current.name);
			},1000);
		} else {
			this.current = this.next;
			this.next = undefined;
			this.current.show();
			this.client.log('Activated layout',this.current.name);
		}
	}
};
LayoutSwitcher.prototype.createLayout = function( name ) {
	var settings = {
		name: name,
		items: this.settings.layouts[name]
	};
	return new Layout(this.client,settings);
};
LayoutSwitcher.prototype.repaint = function() {
	if ( !this.current || !this.current.visible ) return;
	this.current.hide();
	this.current.show();
};

var Layout = function( client, layout ) {
	this.client = client;
	this.layout = layout;
	this.name = this.layout.name;
	this.widgets = [];
	this.parentEl = undefined;
	this.enabled = false;
	this.visible = false;
};
Layout.prototype.enable = function() {
	if ( this.enabled ) return;

	// build widgets
	var i, cls, widget, sources, settings,
		items = this.layout.items;
	for (i=0;i<items.length;i++) {
		settings = items[i];
		cls = this.getWidgetClass(settings.type);
		if ( !cls ) {
			this.log("[ERROR] Widget type is invalid: "+settings.type);
			return;
		}

		// create widget
		widget = new cls(settings);
		this.widgets.push(widget);
		this.client.registerWidget(widget);
	}
	this.enabled = true;
};
Layout.prototype.disable = function() {
	if ( !this.enabled ) return;
	this.hide();

	var i;
	for (i=0;i<this.widgets.length;i++) {
		this.client.unregisterWidget(this.widgets[i]);
	}
	this.widgets = [];

	this.enabled = false;
};
Layout.prototype.show = function() {
	if ( this.visible ) return;
	this.enable();

	this.parentEl = $('<div class="dashboard-layout"/>')
		.appendTo(this.client.el)
		.css({
			position: 'relative',
			width: this.client.el.width(),
			height: this.client.el.height()
		});

	var widgets = this.widgets,
		i, el, widget, settings;
	for ( i in widgets ) {
		widget = widgets[i];
		settings = widget.settings;
		el = $('<div/>')
			.appendTo(this.parentEl)
			.css({
				width: this.getWidgetWidth(settings.width),
				height: this.getWidgetHeight(settings.height)
			});
		if ( settings.top !== undefined || settings.left !== undefined ) {
			el.css({
				position: 'absolute',
				top: this.parseSize(settings.top || 0,this.client.el.height()),
				left: this.parseSize(settings.left || 0,this.client.el.width())
			})
		}
		this.parentEl.append(el);

		widget.setEl(el);
	}
	this.visible = true;
};
Layout.prototype.hide = function() {
	if ( !this.visible ) return;

	var widgets = this.widgets,
		i, el;
	for ( i in widgets ) {
		widgets[i].setEl(undefined);
	}
	this.parentEl.remove();

	this.visible = false;
};
Layout.prototype.getWidgetClass = function( name ) {
	switch (name) {
		case 'chart':
			return ChartWidget;
		case 'number':
			return NumberWidget;
		case 'switch':
			return SwitchWidget;
		case 'alert':
			return AlertWidget;
		default:
			return false;
	}
};
Layout.prototype.parseSize = function( value, max ) {
	if ( typeof value == 'number' ) {
		return value;
	}
	var rv;
	if ( typeof value == 'string' ) {
		if ( rv = /^([0-9.]+)%$/.exec(value) ) {
			value = Math.floor(parseFloat(rv[1]) * max / 100);
		} else if ( rv = /^([0-9.]+)\/([0-9.]+)$/.exec(value) ) {
			value = Math.floor(parseFloat(rv[1])/parseFloat(rv[2])) * max;
		}
	}
	value = Math.floor(parseFloat(value));
	if ( !value || value < 0 ) value = 0;
	else if ( value > max ) value = max;
	return value;
};
Layout.prototype.getWidgetSize = function( value, max ) {
	value = this.parseSize(value,max);
	if ( value < max / 5 ) value = Math.floor(max / 5);
	return value;
};
Layout.prototype.getWidgetWidth = function( value ) {
	return this.getWidgetSize(value,this.client.el.width());
};
Layout.prototype.getWidgetHeight = function( value ) {
	return this.getWidgetSize(value,this.client.el.height());
};


var RemoteSource = function( name, socket ) {
	this.socket = socket;
	this.name = name;
	this.subscribed = false;
	this.data = undefined;
	this.widgets = [];
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
RemoteSource.prototype.reset = function() {
	this.subscribed = false;
	if ( this.widgets.length > 0 ) {
		this.subscribe();
	}
};
RemoteSource.prototype.addWidget = function( widget ) {
	if ( this.widgets.indexOf(widget) == -1 ) {
		this.widgets.push(widget);
	}
	this.subscribe();
};
RemoteSource.prototype.removeWidget = function( widget ) {
	var i = this.widgets.indexOf(widget);
	if ( i != -1 ) {
		this.widgets.splice(i,1);
	}
	if ( this.widgets.length == 0 ) {
		this.unsubscribe();
	}
};
RemoteSource.prototype.getWidgets = function() {
	return this.widgets;
};

var BaseWidget = function(settings,el) {
	this.el = el;
	this.settings = settings;
	this.sources = settings.sources;
	this.data = undefined;
};
BaseWidget.prototype.setEl = function( el ) {
	this.el = el;
	this.update(this.data);
};
BaseWidget.prototype.getEl = function() {
	return this.el;
};
BaseWidget.prototype.getSources = function() {
	return this.sources;
};
BaseWidget.prototype.update = function( data ) {
	this.data = data;
	if ( this.el ) {
		this.render();
	}
};
BaseWidget.prototype.getData = function() {
	var settings = this.settings,
		showSeries = settings.series || [],
		skipSeries = settings.seriesSkip || [],
		series = {};
	for (i in this.data) {
		for (j in this.data[i]) {
			if ( showSeries.length != 0 && showSeries.indexOf(j) == -1 ) {
				continue;
			}
			if ( skipSeries.indexOf( j ) != -1 ) {
				continue;
			}
			series[j] = this.data[i][j];
		}
	}
	return series;
};
BaseWidget.prototype.getLastData = function() {
	var series = this.getData(), value, last = {},
		seriesName;
	for (seriesName in series) {
		if ( series[seriesName].length > 0 ) {
			last[seriesName] = series[seriesName][series[seriesName].length-1];
		} else {
			last[seriesName] = false;
		}
	}
	return last;
};
BaseWidget.prototype.render = function() {
	console.log('BaseWidget.render() is not implemented!');
};

var ChartWidget = function(settings) {
	BaseWidget.apply(this,arguments);
};
util.inherits(ChartWidget,BaseWidget);
ChartWidget.prototype.render = function() {
	if ( !this.el ) return;
	if ( !this.data ) return;
	var series = Object.values(this.getData()),
		settings = this.settings,
		options = {
			lines: {},
			xaxis: {
				tickFormatter: function(x) {
					var	dt = new Date(parseInt(x)),
						h = dt.getHours(),
						m = dt.getMinutes();
					return (h<10?'0':'') + h + ':' + (m<10?'0':'') + m;
				}
			},
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
	setIf( options.lines, 'stacked',  settings.stacked );
	setIf( options.lines, 'fill',     settings.fill );
//	console.log('Flotr.draw',this.el[0],series,options);
	var cp = this.el.css('position');
	Flotr.draw(this.el[0],series,options);
	if (cp == 'absolute')
		this.el.css('position',cp);
};

function setIf( o, property, value ) {
	if ( value !== undefined ) {
		o[property] = value;
	}
};

Object.getFirstItem = function( o, cnt ) {
	cnt = cnt || 1;
	while (cnt--) {
		o = o[Object.keys(o)[0]];
	}
	return o;
};

Object.values = function( o ) {
	var keys = Object.keys(o), i, ret = [];
	for (i=0;i<keys.length;i++) {
		ret.push(o[keys[i]]);
	}
	return ret;
};

var NumberWidget = function(settings) {
	BaseWidget.apply(this,arguments);
};
util.inherits(NumberWidget,BaseWidget);

NumberWidget.prototype.render = function() {
	if ( !this.el ) return;
	if ( !this.data ) return;
	var series = this.getLastData()
	console.log(this.data,list);
	var table = $('<table class="numberTable"/>');
	if (this.settings.horizontal) {
		var tr = $('<tr/>');
		for (key in series) {
			tr.append($('<td/>').text(key));
		}
		table.append(tr);
		var tr = $('<tr/>');
		for (key in series) {
			tr.append($('<td/>').text(series[key][1]));
		}
		table.append(tr);
	}
	else {
		for (key in series) {
			var tr = $('<tr/>');
			tr.append($('<td/>').text(key));
			tr.append($('<td/>').text(series[key][1]));
			table.append(tr);
		}
	}
	this.el.html('');
	this.el.append(table);
};


var SwitchWidget = function(settings) {
	BaseWidget.apply(this,arguments);
};
util.inherits(SwitchWidget,BaseWidget);
SwitchWidget.prototype.render = function() {
	if ( !this.el ) return;
	if ( !this.data ) return;
	var series = this.getLastData();
	this.el.addClass('bulb-container');
	var el, cnt = $('<div/>');
	this.el.html('');
	for (key in series) {
		el = $('<div class="bulb"/>');
		if ( !series[key][1] ) {
			el.addClass('state-error');
		}
		cnt.append(el);
	}
	this.el.append(cnt.children());
};

var AlertWidget = function(settings) {
	BaseWidget.apply(this,arguments);
};
util.inherits(AlertWidget,BaseWidget);


var dashboard = new Dashboard($('#dashboard'));
dashboard.run();
