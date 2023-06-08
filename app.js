var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var otaApiRouter = require('./routes/otaApi');
// Configure Swagger UI
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const fs = require('fs')
var options = {
  customCss: fs.readFileSync(("./swagger.css"), 'utf8')
};

var WebSocket = require('ws');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', function connection(ws) {
  console.log('[SERVER] client connected size: ', wss.clients.size);

  ws.on('message', function incoming(message) {
    console.log('[SERVER] Received WebSocket message:', message);
  });

  ws.on('close', function close() {
    console.log('[SERVER] WebSocket connection closed.');
  });
});
app.set('wss', wss);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Set up static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'ota_files')));
// Configure Swagger UI
app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
// Define the route
app.use('/', indexRouter);
app.use('/otaApi', otaApiRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
