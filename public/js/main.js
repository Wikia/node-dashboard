var Dashboard = function ( el ) {
	this.el = el;
	this.sources = {};
	this.switcher = new LayoutSwitcher(this);

	var self = this;
	$('window').on('resize',function(){
		self.switcher.repaint();
	});
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
	this.switcher.setFlags(data.flags);
};
Dashboard.prototype.onConfigure = function( data ) {
	this.log('Got configuration',data);
	this.switcher.setSettings(data);
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
};
Dashboard.prototype.unregisterWidget = function( widget ) {
	var sources = widget.getSources();
	for (var i=0;i<sources.length;i++) {
		this.getSource(sources[i]).removeWidget(widget);
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
	if ( !this.updated || this.updated < now - this.LAYOUT_CYCLE_LENGTH ) {
		this.updated = now;
		this.next && this.next.disable();
		this.currentLayout = (this.currentLayout + 1) % this.currentDashboard.items.length;
		layoutName = this.currentDashboard.items[this.currentLayout];
		this.next = this.createLayout(layoutName)
		this.client.log('Preparing layout',layoutName);
		this.next.enable();
		if ( this.current ) {
			setTimeout(function(){
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

	this.parentEl = $('<div/>')
		.appendTo(this.client.el)
		.css({
			position: 'relative',
			width: this.client.el.width(),
			height: this.client.el.height()
		});

	var widgets = this.widgets,
		i, el, settings;
	for ( i in widgets ) {
		settings = widgets[i];
		el = $('<div/>')
			.appendTo(this.parentEl)
			.css({
				width: this.getWidgetWidth(settings.width),
				height: this.getWidgetHeight(settings.height)
			});
		this.parentEl.append(el);

		widgets[i].setEl(el);
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
		default:
			return false;
	}
};
Layout.prototype.getWidgetSize = function( value, max ) {
	if ( typeof value == 'number' ) {
		return value;
	}
	var rv;
	if ( typeof value == 'string' && ( rv = /^([0-9.]+)%$/.exec(value) ) ) {
		return Math.floor(parseFloat(rv[1]) * max / 100);
	}
	value = parseFloat(value);
	if ( !value ) value = 0;
	if ( value < max / 5 ) value = Math.floor(max / 5);
	else if ( value > max ) value = max;
	return Math.floor(value);
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

var ChartWidget = function(settings,el) {
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
	if ( this.el ) {
		this.render();
	}
}
ChartWidget.prototype.render = function() {
	if ( !this.el ) return;
	if ( !this.data ) return;
	var series = this.data.series,
		settings = this.settings,
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
	Flotr.draw(this.el[0],[series],options);
};

function setIf( o, property, value ) {
	if ( value !== undefined ) {
		o[property] = value;
	}
}

var dashboard = new Dashboard($('#dashboard'));
dashboard.run();
