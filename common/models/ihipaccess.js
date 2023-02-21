'use strict';
const moment = require('moment');
const request = require('request');
const app=require('../../server/server')
module.exports = function (Ihipaccess) {
  // Before getting master data from api check IHIP acces_token
  // Ihipaccess.beforeRemote("getIhipData", function (ctx, modelInstance, next) {
  //   //...
  //   Ihipaccess.find({}, function (err, res) {
  //     if (err) {
  //       return cb(err)
  //     }

  //     if (!res || res.length == 0) {
  //       // to Get IHIP Token
  //       Ihipaccess.getIhipAccessToken({ accesstype: "new", oldAccessToken: "" }, function (err, IhipAccessToken) {

  //         ctx.req.accessToken = IhipAccessToken.ihipAccessToken;
  //         next();
  //       })
  //     } else {
  //       // return total time for last saved token
  //       const differenceInMinutes = moment().diff(res[0].createdAt, 'minutes');
  //       if (differenceInMinutes > 55) {
  //         // to Get IHIP Token if time is greater than 55 minutes (max time for IHIP token exipre is 1hour )


  //         Ihipaccess.getIhipAccessToken({ type: "exist", oldAccessToken: res[0].ihipAccessToken, id: res[0].id }, function (err, IhipAccessToken) {
  //           ctx.req.accessToken = IhipAccessToken.ihipAccessToken;
  //           next();
  //         })
  //       } else {

  //         ctx.req.accessToken = res[0].ihipAccessToken;
  //         next();
  //       }


  //     }

  //   })



  // });
  // get master data through this method from IHIP
  // Ihipaccess.getIhipData = function (params, obj, cb) {
  //   if (obj.type == "getStates") {
  //     Ihipaccess.getStates({ accessToken: params.accessToken }, function (err, stateres) {
  //       return cb(false, stateres)
  //     })
  //   } else if (obj.type == "getDistricts") {


  //     if (obj.hasOwnProperty("statecode") === true) {
  //       Ihipaccess.getDistricts({
  //         accessToken: params.accessToken,
  //         statecode: obj.statecode
  //       }, function (err, districtres) {
  //         return cb(false, districtres)
  //       })
  //     } else {
  //       Ihipaccess.getStates({
  //         accessToken: params.accessToken
  //       }, function (err, stateres) {
  //         let districtData = [];
  //         for (let i = 0; i < stateres.length; i++) {
  //           Ihipaccess.getDistricts({
  //             accessToken: params.accessToken,
  //             statecode: stateres[i].statecode
  //           }, function (err, districtres) {
  //             districtData.push(
  //               ...districtres,
  //             )
  //             if (i == stateres.length - 1) {
  //               return cb(false, districtData)
  //             }
  //           })
  //         }


  //       })
  //     }

  //   } else if (obj.type == "getSubDistricts") {
  //     Ihipaccess.getSubDistricts({ accessToken: params.accessToken, districtcode: obj.districtcode }, function (err, subdistrictres) {

  //       return cb(false, subdistrictres)
  //     })

  //   } else if (obj.type == "getHealthFacilities") {
  //     Ihipaccess.getHealthFacilities({ accessToken: params.accessToken, statecode: obj.statecode, districtcode: obj.districtcode, subdistrictcode: obj.subdistrictcode, villagecode: obj.villagecode }, function (err, facilitiesres) {

  //       return cb(false, facilitiesres)
  //     })

  //   } else if (obj.type == "getHealthFacilityDetail") {
  //     Ihipaccess.getHealthFacilityDetail({ accessToken: params.accessToken, facilitycode: obj.facilitycode }, function (err, facilityres) {

  //       return cb(false, facilityres)
  //     })

  //   } else if (obj.type == "getVillages") {
  //     Ihipaccess.getVillages({ accessToken: params.accessToken, subdistrictcode: obj.subdistrictcode }, function (err, facilityres) {

  //       return cb(false, facilityres)
  //     })
  //   } else {
  //     return cb(false, [])
  //   }

  // };

  // Ihipaccess.remoteMethod("getIhipData", {
  //   description: "get IHIP Data (state,district,subdistrict, facility etc",
  //   accepts: [{
  //     arg: "params",
  //     type: "object",
  //     http: function (ctx) {
  //       return ctx.req;
  //     }
  //   }, {
  //     arg: "obj",
  //     type: "object"
  //   }],
  //   returns: {
  //     root: true,
  //     type: "array"
  //   },
  //   http: {
  //     verb: "get"
  //   }
  // })

  // getting access token from IHIP server
  Ihipaccess.getIhipAccessToken = function (params, cb) {
    var self = this;
    let obj = {};
    request({
      url: "https://ihip.nhp.gov.in/idsp/oauth/token", // Online url
      method: "POST",
      "rejectUnauthorized": false,
      headers: {
        // header info - in case of authentication enabled
        "Content-Type": "application/x-www-form-urlencoded",
      }, //json
      // body goes here
      form: {
        grant_type: 'password',
        username: 'mpdsr',
        challange: '1356',
        enchallange: 'MTM1Ng==',
        password: 'who2mpdsr$'
      }
    }, function (err, res, body) {
      if (err) {
        return cb(err);
      }
      let obj = {}
      if(!body) console.log("IHIP Issue is there");
      let ihipres = JSON.parse(body)

      obj.ihipAccessToken = ihipres.access_token;
      obj.ihipTokenType = ihipres.token_type;
      obj.createdAt = new Date();
      if (params.accesstype == "new") {
        self.create(obj, function (err, result) {
          return cb(false, obj);
        })
      } else {
        self.replaceById(params.id, obj, function (err, result) {
          return cb(false, obj);
        })
      }


    });

  }
  Ihipaccess.remoteMethod("getIhipAccessToken", {
    description: "get accessToken from ihip server Data",
    accepts: [{
      arg: "params",
      type: "object"
    }],
    returns: {
      root: true,
      type: "object"
    },
    http: {
      verb: "post"
    }
  });
  // End of getting access token from IHIP server

  // Getting state list from ihip server
  Ihipaccess.getStates = function (param, cb) {
    Ihipaccess.app.models.state.find(
      {
        where: {},
      },
      function (err, response) {
      if (err) {
            return cb(err);
          }
    
          if (!response) {
    
            var err = new Error('no records found');
            err.statusCode = 404;
            err.code = 'NOT FOUND';
            return cb(err);
          }
      return cb(false, response);
      });

    /*request({
      //url: "https://ihiptraining.in/ihsp-res/query/getstates", // Online url
      url:"https://ihip.nhp.gov.in/ihsp-res/query/getstates",
      method: "GET",
      "rejectUnauthorized": false,
      headers: {
        // header info - in case of authentication enabled
        "Authorization": 'Bearer ' + param.accessToken,
      }
    }, function (err, res, body) {
      if (err) {
        return cb(err);
      }
      if (!body) {
        var err = new Error('no records found');
        err.statusCode = 404;
        err.code = 'NOT FOUND';
        return cb(err);
      }
      return cb(false, JSON.parse(body));
    });
*/

  }
  // --------------- Getting Districts (Pass the state code has parameter) ----------------------------
  Ihipaccess.getDistricts = function (param, cb) {
    Ihipaccess.app.models.district.find(
            {
              where: {
                stateCode : param.statecode
              },
            },
            function (err, response) {
				
            if (err) {
                  return cb(err);
                }
          
                if (!response) {
          
                  var err = new Error('no records found');
                  err.statusCode = 404;
                  err.code = 'NOT FOUND';
                  return cb(err);
                }
            return cb(false, response);
            });
    /*request({
      //url: "https://ihiptraining.in/ihsp-res/query/getdistrictsbystate?statecode=" + param.statecode, // Online url
      url: "https://ihip.nhp.gov.in/ihsp-res/query/getdistrictsbystate?statecode=" + param.statecode, // Online url
      method: "GET",
      "rejectUnauthorized": false,
      headers: {
        // header info - in case of authentication enabled
        "Authorization": 'bearer' + param.accessToken,
      }
    }, function (err, res, body) {
      if (err) {
        return cb(err);
      }
      if (!body) {
        var err = new Error('no records found');
        err.statusCode = 404;
        err.code = 'NOT FOUND';
        return cb(err);
      }
      return cb(false, JSON.parse(body));
    });*/

  }
  // --------------- Getting Sub Districts/Talukas (Pass the District code has parameter) --------
  Ihipaccess.getSubDistricts = function (param, cb) {
    /*request({
      //url: "https://ihiptraining.in/ihsp-res/query/gettaluksbydist?districtcode=" + param.districtcode, // Online url
      url: "https://ihip.nhp.gov.in/ihsp-res/query/gettaluksbydist?districtcode=" + param.districtcode, // Online url
      method: "GET",
      "rejectUnauthorized": false,
      headers: {
        // header info - in case of authentication enabled
        "Authorization": 'bearer' + param.accessToken,
      }
    }, function (err, res, body) {
      if (err) {
        return cb(err);
      }
      if (!body) {
        var err = new Error('no records found');
        err.statusCode = 404;
        err.code = 'NOT FOUND';
        return cb(err);
      }
      return cb(false, JSON.parse(body));
    });*/
	Ihipaccess.app.models.subdistrict.find(
          {
            where: {
              //stateCode : param.statecode,
              districtCode : param.districtcode
            },
          },
          function (err, response) {
          if (err) {
                return cb(err);
              }
        
              if (!response) {
        
                var err = new Error('no records found');
                err.statusCode = 404;
                err.code = 'NOT FOUND';
                return cb(err);
              }
          return cb(false, response);
          });
  }
  //----- Getting villages by Subdistrict code---------------------------------------------------
  Ihipaccess.getVillages = function (param, cb) {
    request({
      //url: "https://ihiptraining.in/ihsp-res/query/getvillagebySubdisid?subdistrictid=" + param.subdistrictcode, // Online url
      url: "https://ihip.nhp.gov.in/ihsp-res/query/getvillagebySubdisid?subdistrictid=" + param.subdistrictcode, // Online url
      method: "GET",
      "rejectUnauthorized": false,
      headers: {
        // header info - in case of authentication enabled
        "Authorization": 'bearer' + param.accessToken,
      }
    }, function (err, res, body) {

      if (err) {
        return cb(err);
      }

      if (!body) {

        var err = new Error('no records found');
        err.statusCode = 404;
        err.code = 'NOT FOUND';
        return cb(err);
      }
      return cb(false, JSON.parse(body));
    });

  }
  //-------- Getting Health Facilities in the Sub districts ------------------------
  Ihipaccess.getHealthFacilities = function (param, cb) {

    request({
      //url: "https://ihiptraining.in/ihsp-res/query/getHospitalFacilities?villagecode=" + param.villagecode + "&subdistrictcode=" + param.subdistrictcode + "&districtcode=" + param.districtcode + "&statecode=" + param.statecode,
      url: "https://ihip.nhp.gov.in/ihsp-res/query/getHospitalFacilities?villagecode=" + param.villagecode + "&subdistrictcode=" + param.subdistrictcode + "&districtcode=" + param.districtcode + "&statecode=" + param.statecode,
      method: "GET",
      "rejectUnauthorized": false,
      headers: {
        // header info - in case of authentication enabled
        "Authorization": 'bearer' + param.accessToken,
      }
    }, function (err, res, body) {

      if (err) {
        return cb(err);
      }

      if (!body) {

        var err = new Error('no records found');
        err.statusCode = 404;
        err.code = 'NOT FOUND';
        return cb(err);
      }
      return cb(false, JSON.parse(body));
    });

  }
  //-------- Getting Health Facility Details(Pass facility code) ------------------------
  Ihipaccess.getHealthFacilityDetail = function (param, cb) {
    request({
      //url: "https://ihiptraining.in/ihsp-res/query/getfacilityinfobyid?facilityid=" + param.facilitycode,
      url: "https://ihip.nhp.gov.in/ihsp-res/query/getfacilityinfobyid?facilityid=" + param.facilitycode,
      method: "GET",
      "rejectUnauthorized": false,
      headers: {
        // header info - in case of authentication enabled
        "Authorization": 'Bearer ' + param.accessToken,
      }
    }, function (err, res, body) {
      if (err) {
        return cb(err);
      }

      if (!body) {

        var err = new Error('no records found');
        err.statusCode = 404;
        err.code = 'NOT FOUND';
        return cb(err);
      }
      return cb(false, JSON.parse(body));
    });

  }

  Ihipaccess.getIhipData = async function (params, obj) {
    if (obj.type == "getStates") {
      const stateModel = app.models.state;
      const states = await stateModel.find({});
      return states
    } else if (obj.type == "getDistricts") {
      const districtModel = app.models.district;
      let districts
       districts = await districtModel.find({ where: { stateCode:obj.statecode} });
       if(districts.length===0){
        districts= await districtModel.find({where:{stateCode:{inq: obj.statecode}  }})
       }
      return districts

    } else if (obj.type == "getSubDistricts") {
      const subdistrictModel = app.models.subdistrict;
      let subdistrict
       subdistrict = await subdistrictModel.find({ where: { districtcode: obj.districtcode } });
       if(subdistrict.length===0){
        subdistrict=await subdistrictModel.find({where:{districtcode:{inq:obj.districtcode}}})
       }
      return subdistrict;

    } else if (obj.type == "getHealthFacilities") {
      const self = this;
      const facilityModel =app.models.facility;
      const facilityres = await facilityModel.find({ where: {health_facility_district_code : obj.districtcode,health_facility_state_code:obj.statecode, health_facility_sub_district_code: obj.subdistrictcode } })
      return facilityres
    } else if (obj.type == "getHealthFacilityDetail") {
      const facilityModel = app.models.facility;
      const healthfacility = await facilityModel.findOne({ where: { facilitycode: obj.facilitycode } })
      return healthfacility

    } else if (obj.type == "getVillages") {
    
      const villageModel = app.models.village;
      const villages = await villageModel.find({ where: { subdistrictCode: obj.subdistrictcode },fields:{villagecode:true,villagename:true,category:true} })
      
      return villages;
    }
  }
  Ihipaccess.remoteMethod("getIhipData", {
    description: "get IHIP Data (state,district,subdistrict, facility etc",
    accepts: [{
      arg: "params",
      type: "object",
      http: function (ctx) {
        return ctx.req;
      }
    }, {
      arg: "obj",
      type: "object"
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  })
}
