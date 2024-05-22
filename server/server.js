'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var helmet = require('helmet');
const contentSecurityPolicy = require('./contentSecurityPolicy');
const hstsMiddleware = require('./hsts');
const securityHeadersMiddleware = require('./securityHeader');
var app = module.exports = loopback();

const initialAuthenticationHandler = require('./initial-authentication');

boot(app, __dirname, function(err) {
  if (err) throw err;

  // Disable Server Banner
  app.set('remingServer', false);

  app.use(helmet());
  app.use(contentSecurityPolicy());
  app.use(hstsMiddleware());
  app.use(securityHeadersMiddleware());
  // Use the initialAuthenticationHandler middleware for all routes under '/api/*'
  app.use('/api/*', initialAuthenticationHandler(app));

  // Error handling middleware
  app.use(function(err, req, res, next) {
    console.log(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  // start the server if `$ node server.js`
  if (require.main === module) app.start();
});

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);

    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};