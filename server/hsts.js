module.exports = function() {
    return function hstsMiddleware(req, res, next) {
      // Set the Strict-Transport-Security header
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
      next();
    };
  };