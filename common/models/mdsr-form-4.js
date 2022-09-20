'use strict';
var async = require('async');
const e = require('express');
const { STATES_CODES } = require('../../shared/states/state');
module.exports = function (Mdsrform4) {
  Mdsrform4.fbmdrVsCbmdrSubmitted = function (params, cb) {
    var self = this;
    const Mdsrform4Collection = self.getDataSource().connector.collection(Mdsrform4.modelName);
    const { statecodes, fromDate, toDate, accessupto, subdistrictcodes, districtcodes } = params;
    // get all fbmdr cases submitted statewise
    const obj = {};
    let group = {};
    const where = {
      "createdAt": { $gte: new Date(fromDate), $lte: new Date(toDate) },
    }
    if (accessupto === 'National') {
      if (statecodes && statecodes.length) {
        where["general_information.state.statecode"] = { $in: statecodes }
      }
      obj.type = "getStates";
      group = {
        _id: { statename: "$statename", statecode: "$statecode" },
        fbmdr: { $sum: 1 },
        cbmdr: { $sum: { $cond: [{ $gt: ["$cbmdr", 0] }, 1, 0] } }
      }
    } else if (accessupto === 'State') {
      where["general_information.state.statecode"] = {$in:statecodes};
      if(districtcodes && districtcodes.length){
        where["general_information.district.districtcode"] = { $in: districtcodes }
      }
      obj.statecode = params.statecodes[0];
      obj.type = 'getDistricts';

      group = {
        _id: { district: "$district", districtcode: "$districtcode" },
        fbmdr: { $sum: 1 },
        cbmdr: { $sum: { $cond: [{ $gt: ["$cbmdr", 0] }, 1, 0] } }
      }
    } else if (accessupto === 'District') {
      where["general_information.district.districtcode"] = { $in: districtcodes };
      if (subdistrictcodes && subdistrictcodes.length) {
        where["general_information.block.subdistrictcode"] = { $in: subdistrictcodes }
      }

      group = {
        _id: { subdistrictname: "$subdistrictname", subdistrictcode: "$subdistrictcode" },
        fbmdr: { $sum: 1 },
        cbmdr: { $sum: { $cond: [{ $gt: ["$cbmdr", 0] }, 1, 0] } }
      }
    }

    async.parallel({
      master: (callback) => {
        Mdsrform4.app.models.Ihipaccess.getIhipAccessToken({
          accesstype: "new",
          oldAccessToken: ""
        }, (err, res) => {
          let obj = {
            accessToken: res.ihipAccessToken
          }

          if (params.type === 'getSubDistricts') {
            obj.type = 'getSubDistricts';
            if (params.hasOwnProperty('districtcodes')) {
              obj.districtcode = params.districtcodes[0];
            }
          } else if (params.type === "getDistricts") {
            obj.type = "getDistricts";
            if (params.hasOwnProperty("statecodes")) {
              obj.statecode = params.statecodes[0];
            }
          } else {
            obj.type = "getStates"
          }
          Mdsrform4.app.models.Ihipaccess.getIhipData({ accessToken: res.ihipAccessToken }, obj, (err, ihipData) => {
            callback(null, ihipData);
          })
        })
      },
      fbmddrData: (callback) => {
        const cursor = Mdsrform4Collection.aggregate([
          { $match: where },
          {
            $lookup: {
              from: "mdsr_form_5",
              localField: "deceased_women_id_new",
              foreignField: "deceased_women_id_new",
              as: "cbmdr"
            }
          }, {
            $project: {
              fbmdr: "$deceased_women_id_new",
              statename: "$general_information.state.statename",
              statecode: "$general_information.state.statecode",
              district: "$general_information.district.districtname",
              districtcode: "$general_information.district.districtcode",
              subdistrictname: "$general_information.block.subdistrictname",
              subdistrictcode: "$general_information.block.subdistrictcode",
              cbmdr: { $size: "$cbmdr" }
            },
          }, {
            $group: group
          }, {
            $project: {
              _id: 0,
              statename: "$_id.statename",
              statecode: "$_id.statecode",
              districtname: "$_id.district",
              districtcode: "$_id.districtcode",
              subdistrictcode: "$_id.subdistrictcode",
              subdistrictname: "$_id.subdistrictname",
              fbmdr: 1,
              cbmdr: 1,
              percent: { $multiply: [{ $divide: ["$cbmdr", "$fbmdr"] }, 100] }
            }
          }
        ]);

        cursor.get(function (err, data) {
          if (err) return cb(err);
          return callback(null, data);
        });
      }
    }, function (err, results) {
      let data = [];
      const { master, fbmddrData } = results;
      if (accessupto === 'National') {
        for (const state of STATES_CODES) {
          const fbmdr = fbmddrData.find(fbmdr => fbmdr.statecode === state.statecode);
          if (fbmdr) {
            data.push({ ...state, fbmdr: fbmdr.fbmdr, cbmdr: fbmdr.cbmdr, percent: Math.round(fbmdr.percent) })
          } else {
            data.push({ ...state, fbmdr: 0, cbmdr: 0, percent: 0 })
          }
        }
        if (statecodes && statecodes.length) {
          return cb(false, data.filter(item => statecodes.includes(item.statecode)))
        }
      } else if (accessupto === 'State') {
        for (const district of master) {
          const fbmdr = fbmddrData.find(fbmdr => fbmdr.districtcode === district.districtcode);
          if (fbmdr) {
            data.push({ ...district, fbmdr: fbmdr.fbmdr, cbmdr: fbmdr.cbmdr, percent: Math.round(fbmdr.percent) })
          } else {
            data.push({ ...district, fbmdr: 0, cbmdr: 0, percent: 0 })
          }
        }
        if (districtcodes && districtcodes.length) {
          return cb(false, data.filter(item => districtcodes.includes(item.districtcode)))
        }
      } else if (accessupto === 'District') {
        for (const block of master) {
          const fbmdr = fbmddrData.find(fbmdr => fbmdr.subdistrictcode === block.subdistrictcode);
          if (fbmdr) {
            data.push({ ...block, fbmdr: fbmdr.fbmdr, cbmdr: fbmdr.cbmdr, percent: Math.round(fbmdr.percent) })
          } else {
            data.push({ ...block, fbmdr: 0, cbmdr: 0, percent: 0 })
          }
        }
        if (subdistrictcodes && subdistrictcodes.length) {
          return cb(false, data.filter(item => subdistrictcodes.includes(item.subdistrictcode)))
        }
      }
      return cb(false, data)
    });
  };

  Mdsrform4.remoteMethod('fbmdrVsCbmdrSubmitted', {
    description: 'Out of FBMDR How many CBMDR Has been submitted in %',
    accepts: [{
      arg: 'params',
      type: 'object',
    }],
    returns: {
      root: true,
      type: 'array',
    },
    http: {
      verb: 'get',
    },
  });
};
