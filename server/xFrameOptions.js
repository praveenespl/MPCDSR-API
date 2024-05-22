// middleware/xFrameOptions.js
module.exports = function() {
    return function(req, res, next) {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        next();
    };
};
