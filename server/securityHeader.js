module.exports = function() {
    return function securityHeadersMiddleware(req, res, next) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      res.setHeader('Feature-Policy', 'camera "none"; microphone "none"; geolocation "none"');
  
      // Remove unnecessary headers
      res.removeHeader('X-Powered-By');
  
      next();
    };
  };