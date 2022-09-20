const request = require("request");
function sendSMS(param) {
  console.log(param);
  return new Promise((resolve, reject) => {
    let url = param;
    request({
        method: "GET",
        url: encodeURI(url),
        gzip: true,
    },function (err, result) {
        if (err) reject(err);
        resolve(result);
      });
  });
}
module.exports = {
  sendSMS
};
