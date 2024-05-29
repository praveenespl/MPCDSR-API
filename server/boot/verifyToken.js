var app = require("../server");
function verifyAccessToken(token,created,ttl) {

          const now = new Date().getTime();
          const expiresAt = new Date(created).getTime() + ttl * 1000;
          if (now >= expiresAt) {  
        //     app.models.AccessToken.replaceOrCreate(accesstokens, function (err, updatedAccessToken) {
        //     if (err) {
        //       console.log("----------->",err);
        //     }
        //    return updatedAccessToken[0].id;
        //   });
        return token
            // reject(new Error('Access token has expired'));
          } else {
            return token;
          }
        
  }
  
  module.exports = {
    verifyAccessToken,
  };