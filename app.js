const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
// Router
const indexRouter = require('./routes/index');
const userRouter = require('./routes/user');
const videoRouter = require('./routes/video');
const convertRouter = require('./routes/convert');

const app = express();

// Create session
app.use(session({
    secret: "!$&(^#@",
    resave: false,
    saveUninitialized: true,
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/thumbnail', express.static(path.join(__dirname, '/public/images/thumbnail')));
app.use('/source', express.static(path.join(__dirname, '/public/dist')));

// Append router
app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/video', videoRouter);
app.use('/convert', convertRouter);

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
