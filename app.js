var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const cors = require('cors')
var logger = require('morgan');
require('dotenv').config();

var redis = require('./public/javascripts/redis');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var privateTransferRouter = require('./routes/privateTransfer');
var redisRouter = require('./routes/redis');
var imageRouter = require('./routes/image');
var tpcAndAddressRouter = require('./routes/tpcAndAddress');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
app.all('*', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/privateTransfer',privateTransferRouter)
app.use('/redis',redisRouter)
app.use('/image',imageRouter)
app.use('/tpcAndAddress',tpcAndAddressRouter)


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
