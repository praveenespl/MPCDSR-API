'use strict';

module.exports = function(Momfbmdrcs) {
  Momfbmdrcs.observe("before save", async function (ctx, next) {
    if (ctx.instance) {
      ctx.instance['createdAt'] = (new Date()).getTime();
      ctx.instance['createdDate'] = (new Date()).getDate();
      ctx.instance['createdMonth'] = (new Date()).getMonth()+ 1;
      ctx.instance['createdYear'] = (new Date()).getFullYear();
    } else {
      ctx.data['updatedAt'] = (new Date()).getTime();
    }
    return next();
  });
};
