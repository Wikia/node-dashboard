var path = require('path');
var util = require('util');
var express = require('express');
var dashboards = require("./lib/dashboards")

var app = express();

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
app.listen(port)

app.get('/status', function(req, res) {
  res.send('OK '+new Date().toString(), 200);
});

app.get('/', dashboards.list)

util.log('Server started on port ' + port);

