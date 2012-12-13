var path = require('path')
	, util = require('util')
	, express = require('express')
	, http = require('http');

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

var services = {
	'list-dashboard': function( socket, data ) {
		socket.emit('news',{hello:'world'});
	}
};

io.sockets.on('connection', function (socket) {
	for (var i in services) {
		socket.on(i,(function(fn){
			return function(data){
				fn.call(this,socket,data);
			}
		})(services[i]));
	}
});


util.log('Server started on port ' + port);

