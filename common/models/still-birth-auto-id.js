'use strict';

module.exports = function(stillBirthAutoId) {
    
stillBirthAutoId.getSBId = function (params, cb) {
    stillBirthAutoId.find({}, function (err, sbid) {
      let prefix = sbid[0].prefix;
      let value = sbid[0].value;
      let shortCode = sbid[0].stateNamePrefix.filter(code => code.statecode == params.statecode);// state name short code prefix
      let finalSBID = { "value": value, "stateNamePrefix": shortCode.length > 0 ? shortCode[0].stateCode : 'SB' };//Withoutprefix
      let newVal = finalSBID.value + 1;

      // let finalSBID=prefix+newVal;//Withprefix
      stillBirthAutoId.app.models.stillbirth.find(
        {
          where: {
            stillBirthNo: value
            //stillBirthNo : finalSBID
          },
        },
        function (err, response) {

          if (response.length > 0) {
            stillBirthAutoId.update({
              "value": sbid[0].value + 2
            }, function (err, finsbid) {
              stillBirthAutoId.find({}, function (err, sbid) {
                let prefix = sbid[0].prefix;
                let value = sbid[0].value;
                let shortCode = sbid[0].stateNamePrefix.filter(code => code.statecode == params.statecode);// state name short code prefix
                let finalSBID = { "value": value, "stateNamePrefix": shortCode.length > 0 ? shortCode[0].stateCode : 'SB' };//Withoutprefix
                //let finalSBID = value;//Withoutprefix
                let newVal = finalSBID.value + 1;
                // let finalSBID=prefix+newVal;//Withprefix
                return cb(false, finalSBID)
              })
            })
          } else {
            stillBirthAutoId.update({
              "value": sbid[0].value + 1
            }, function (err, finsbid) {
            })
            return cb(false, finalSBID)

          }
        })
    });
  }
  stillBirthAutoId.remoteMethod(
    'getSBId', {
    description: 'Get StillBirth Id',
    accepts: [{
      arg: "params",
      type: "object"
    }],
    returns: {
      root: true,
      type: 'array'
    },
    http: {
      verb: 'get'
    }
  });


};
