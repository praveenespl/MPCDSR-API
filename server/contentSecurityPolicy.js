module.exports = function() {
    return function contentSecurityPolicy(req, res, next) {
   // Define your Content Security Policy
   const csp = `
   default-src 'self';
   script-src 'self' 'unsafe-inline' 'unsafe-eval';
   style-src 'self' 'unsafe-inline';
   img-src 'self' data:;
   font-src 'self' data:;
   connect-src 'self';
   frame-ancestors 'none';
   form-action 'self';
   base-uri 'self';
   object-src 'none';
 `;

 // Set the Content-Security-Policy header
 res.setHeader('Content-Security-Policy', csp.replace(/\s{2,}/g, ' ').trim());

 next();
    };
  };