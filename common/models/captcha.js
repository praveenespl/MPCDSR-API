'use strict';
var svgCaptcha = require('svg-captcha');
var path = require('path');
module.exports = function(Captcha) {
  Captcha.generateCaptcha = function(cb) {
    //console.log("Param is ",param)
    //let randomNumber = Math.floor(1000 + Math.random() * 9000).toString();
    //console.log(randomNumber.length)
    svgCaptcha.loadFont(path.join(__dirname, '../font/ARIAL.TTF'));
    const captcha = svgCaptcha.create({
      color: true,
      background: "#F0F0F0",
      noise: 1,
      fontSize:25
    });
    let obj = {
      text: captcha.text
    }    
    Captcha.create(obj, function(err, result) {
      if (err) {
        return cb(err);
      }
      let obj = {
        catpchaid: result.id,
        data: captcha.data
      }
      return cb(false, obj)
    })
  }
  Captcha.remoteMethod(
    'generateCaptcha', {
      description: 'generate captcha for login',
      returns: {
        root: true,
        type: 'object'
      },
      http: {
        verb: 'get'
      }
    }
  )
  Captcha.validateCaptcha = function(param, cb) {

    if (param.captchaid === undefined || param.captchaid === "" || param.text === undefined || param.text == "") {
      var err = new Error('Invalid Captcha');
      err.statusCode = 401;
      err.code = 'Invalid Captcha';
      return cb(err);
    }
    Captcha.find({
      where: {
        id: param.captchaid,
        text: param.text
      }
    }, function(err, result) {
      let obj = {};
      if (err) {
        obj["captchaStatus"]=false;
        return cb(obj);
      }

      if (result.length===0) {
        obj["captchaStatus"]=false;
      }else{
        obj["captchaStatus"]=true;
      }
      return cb(false, obj);
    })
  }
  Captcha.remoteMethod(
    'validateCaptcha', {
      description: 'Validate Captcha for login',
      accepts: [{
        arg: 'param',
        type: 'object'
      }],
      returns: {
        root: true,
        type: 'object'
      },
      http: {
        verb: 'get'
      }
    }
  )
};
