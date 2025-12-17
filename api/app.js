require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

// Import routes
var authRouter = require('./routes/auth');
var accountsRouter = require('./routes/accounts');
var transactionsRouter = require('./routes/transactions');
var reportsRouter = require('./routes/reports');

var app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler - return JSON instead of rendering
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    error: err.message,
    details: req.app.get('env') === 'development' ? err.stack : undefined
  });
});

module.exports = app;
