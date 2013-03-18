#!/usr/bin/env node
var path = require('path')
	, util = require('util')
	, express = require('express')
	, http = require('http')
	, DataServer = require('./lib/dataserver')
	, config_parser = require('./lib/config_parser')
	, settings = config_parser.expand(require('./settings' ));

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 1);                    // no trash in logs

var rootPath = process.cwd();
var staticPath = path.join(rootPath, 'public');

app.configure(function () {
  util.log("Express server static directory: " + staticPath);
  app.use(express.static(staticPath));
  app.use(express.favicon(path.join(staticPath, 'favicon.ico')));
  app.use(express.logger());
  app.use(express.bodyParser()); // json, urlencoded, multipart
});
var port = process.env.PORT || 8080;
server.listen(port)

app.get('/status', function(req, res) {
  res.send('OK '+new Date().toString(), 200);
});

var dataServer = new DataServer(settings,io);
dataServer.run();

app.get('/providers', function(req, res) { // for testing
  res.send(Object.keys(dataServer.providers).join('\n'), 200);
});

app.get('/sources', function(req, res) { // for testing
  res.send(Object.keys(dataServer.sources).join('\n'), 200);
});

util.log('Server started on port ' + port);
