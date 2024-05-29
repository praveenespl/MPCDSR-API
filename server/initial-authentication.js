const { verifyAccessToken } = require('./boot/verifyToken');

module.exports = function(app) {
  return function initialAuthenticationHandler(req, res, next) {
    var token = req.headers.authorization || req.query.access_token;
    // Define an array of public routes that don't require authentication
    var publicRoutes = [
      '/api/usermasters/login',
      '/api/captchas/generateCaptcha',
      '/api/captchas/validateCaptcha',
      '/explorer'
    ];

    // Construct the complete URL path
    const urlPath = req.originalUrl || (`${req.protocol}://${req.get('host')}${req.originalUrl}`);

    // Check if the requested URL path is public
    if (publicRoutes.some(route => urlPath.startsWith(route))) {
      return next(); 
    }

    if (token) {
     const verifiedtoken= verifyAccessToken(token,req.headers.created,req.headers.ttl)
        if (!verifiedtoken) {
          return next(new Error('Access token has expired'));
        }else{
          next()
        }
    } else {
      // If no token is provided, pass an error object to next()
       next(new Error('Access token is required'));
      // next()
    }
  };
};