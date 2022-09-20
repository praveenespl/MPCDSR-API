'use strict';

var os = require( 'os' );
var ip = require('ip');
var ObjectId = require('mongodb').ObjectID;

var bcrypt;
try {
  // Try the native module first
  bcrypt = require('bcrypt');
  // Browserify returns an empty object
  if (bcrypt && typeof bcrypt.compare !== 'function') {
    bcrypt = require('bcryptjs');
  }
} catch (err) {
  // Fall back to pure JS impl
  bcrypt = require('bcryptjs');
}
module.exports = function(Usermaster) {
  //calling remote method after login
  Usermaster.afterRemote('login', function(context, loginObj, next) {
    console.log('Turning off the engine, removing the key.');
    //console.log(context.instance);
    //console.log("Value is");
    //console.log(remoteMethodOutput);

    //var networkInterfaces = os.networkInterfaces( );

    //console.log( "Network ",networkInterfaces );
    let loginInfoObj = {
      user_id:loginObj.id,
      login_time:new Date()
    }
    Usermaster.app.models.Logininfo.create(loginInfoObj,function(err,result){

      next();
    })
  });
  //login method
  Usermaster.login = function(credentials, include, cb) {
    var self = this;
    console.log("credentials--", credentials);
    //let credentials = credentials.options;
    if (credentials.username === undefined || credentials.username == "") {
      var err = new Error('Username is required');
      err.statusCode = 401;
      err.code = 'LOGIN_FAILED';
      return cb(err);
    }

    if (credentials.password === undefined || credentials.password == "") {
      var err = new Error('Password is required');
      err.statusCode = 401;
      err.code = 'LOGIN_FAILED';
      return cb(err);
    }

    self.findOne({
      where: {
        username: credentials.username
      },
      include: [{
        relation: 'useraccess'
      },{
        relation: 'state'
      },{
        relation: 'district'
      },{
        relation: 'block'
      }]

    }, function(err, user) {
      if (err) {
        console.log(err);
        return cb(err);
      }
      if (!user) {
        var err = new Error('Oops!!!, Invalid Username or Password.');
        err.statusCode = 401;
        err.code = 'LOGIN_FAILED';
        return cb(err);
      }
      if (user.length == 0) {
        var err = new Error('Oops!!!, Invalid Username or Password.');
        err.statusCode = 401;
        err.code = 'LOGIN_FAILED';
        return cb(err);
      }

      if (user.useridactive) {
        bcrypt.compare(credentials.password, user.password, function(err, isMatch) {
          if (err) {
            console.log(err);
            return cb(err);
          }
          if (!isMatch) {
            var defaultError = new Error('Oops!!!, Invalid Password.');
            defaultError.statusCode = 401;
            defaultError.code = 'LOGIN_FAILED';
            return cb(defaultError);
          } else {
            let accesstokens = [];
            user.createAccessToken(86400, function(err, token) {
              if (err)
                return cb(err);

              if (!accesstokens || accesstokens === undefined) {
                accesstokens = [];
              }
              accesstokens.push(token);
              user.accessToken = accesstokens[0];


              self.app.models.AccessToken.replaceOrCreate(accesstokens, function(err, updatedAccessToken) {
                if (err) {
                  console.log(err);
                }
                console.log(user)
                let obj = JSON.parse(JSON.stringify(user))
                delete obj.viewPassword;
                return cb(false, obj);
              });
            });
          }
        });
      } else {
        var err = new Error('Status In-active, Can Not Login Further.');
        err.statusCode = 401;
        err.code = 'LOGIN_FAILED';
        return cb(err);
      }
    })
  }

//----------------------------------------------

Usermaster.changePasswordAPI = function(param, cb) {
let params=param.updateObj;
    var self = this;
    var userLoginCollection = this.getDataSource().connector.collection(Usermaster.modelName);

    if (params.userId === undefined || params.userId == "") {
        var err = new Error('User Id is undefined or empty');
        err.statusCode = 401;
        err.code = 'LOGIN_FAILED';
        return cb(err);
    }

    if (params.oldPassword === undefined || params.oldPassword == "") {
        var err = new Error('Old Password is undefined or empty');
        err.statusCode = 401;
        err.code = 'LOGIN_FAILED';
        return cb(err);
    }

    if (params.newPassword === undefined || params.newPassword == "") {
        var err = new Error('New Password is undefined or empty');
        err.statusCode = 401;
        err.code = 'LOGIN_FAILED';
        return cb(err);
    }
    let MAX_PASSWORD_LENGTH = 72;
    let len = Buffer.byteLength(params.newPassword, 'utf8');
    if (len > MAX_PASSWORD_LENGTH) {
        err = new Error('The password entered was too long. Max length is ' + MAX_PASSWORD_LENGTH + '(entered ' + len + ')');
        err.code = 'PASSWORD_TOO_LONG';
        err.statusCode = 422;
        return cb(err);
    }

    this.findById(params.userId, function (err, user) {
        if (err) {
            console.log(err);
            return cb(err);
        }
        if (!user) {
            const err = new Error(`User ${params.userId} not found`);
            err.statusCode = 401;
            err.code = 'USER_NOT_FOUND';
            return cb(err);
        }


        if (user.password && params.oldPassword) {
            bcrypt.compare(params.oldPassword, user.password, function (err, isMatch) {
                if (err) return cb(false, err);
                if (!isMatch) {
                    var defaultError = new Error('Invalid Current Password');
                    defaultError.statusCode = 401;
                    defaultError.code = 'INVALID_PASSWORD';
                    return cb(defaultError);
                }

                bcrypt.hash(params.newPassword, 10, function (err, hash) {
                    if (err) {
                        return (err);
                    }

                    userLoginCollection.update({
                        _id: ObjectId(params.userId)

                    }, {
                            $set: {
                                password: hash,
                                viewPassword: params.newPassword,
                                updatedAt: new Date()
                            }
                        },
                        function (err, result) {
                            if (err) {
                                return err;
                            }
                            return cb(false, result.result.n)
                        });
                });
            });
        } else {
            return cb(false, false)
        }
    });
  }

  Usermaster.remoteMethod(
    'changePasswordAPI', {
        description: 'Change User\'s Password - User Defined API',
        accepts: [{ 
            arg: 'params',
            type: 'object',
            http: { source: 'body' }
        }],
        returns: {
            root: true,
            type: 'object'
        },
        http: {
            verb: 'post'
        }
    }
)
};
