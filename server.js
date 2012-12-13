var path = require('path')
	, util = require('util')
	, express = require('express')
	, http = require('http')
	, DataServer = require('./lib/dataserver')
	, settings = require('./settings' );

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

var rootPath = process.cwd();
var staticPath = path.join(rootPath, 'public');

app.configure(function () {
  util.log("Express server static directory: " + staticPath);
  app.use(express.static(staticPath));
  app.use(express.favicon(path.join(staticPath, 'favicon.ico')));
  app.use(express.logger());
  app.use(express.bodyParser()); // json, urlencoded, multipart
  //app.use(express.methodOverride());
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
  res.send()
  res.send(Object.keys(dataServer.sources).join('\n'), 200);
});

util.log('Server started on port ' + port);
