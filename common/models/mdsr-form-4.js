'use strict';
var async = require('async');
const e = require('express');
const { STATES_CODES } = require('../../shared/states/state');
var app = require('../../server/server')
module.exports = function (Mdsrform4) {
  Mdsrform4.fbmdrVsCbmdrSubmitted = async function (params) {
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
      where["general_information.state.statecode"] = { $in: statecodes };
      if (districtcodes && districtcodes.length) {
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

    if (params.type == "getStates") {
      const stateModel = app.models.state;
      var response = await stateModel.find({});
    } else if (params.type == "getDistricts") {
      const districtModel = app.models.district;
      var response = await districtModel.find({ where: { stateCode: params.statecodes[0] } });

    } else if (params.type == "getSubDistricts") {
      const subdistrictModel = app.models.subdistrict;
      var response = await subdistrictModel.find({ where: { districtcode: params.districtcodes[0] } })

    } else {
      const stateModel = app.models.state;
      var response = await stateModel.find({where:{},fields: {
        "statename": true,
        "statecode": true
      }
     } );

    }

    var cursor = await Mdsrform4Collection.aggregate([
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
    ]).toArray();

    let data = [];
    if (accessupto === 'National') {
      for (const state of response) {
        const fbmdr = cursor.find(fbmdr => fbmdr.statecode === state.statecode);
        // console.log("fbmdr",fbmdr)
        if (fbmdr) {
          data.push({ ...state.__data, fbmdr: fbmdr.fbmdr, cbmdr: fbmdr.cbmdr, percent: Math.round(fbmdr.percent) })
          // console.log('---->>>data',{ ...state, fbmdr: fbmdr.fbmdr, cbmdr: fbmdr.cbmdr, percent: Math.round(fbmdr.percent) })
        } else {
          data.push({ ...state.__data, fbmdr: 0, cbmdr: 0, percent: 0 })
        }
      }
      if (statecodes && statecodes.length) {
        return("aniket",data.filter(item => statecodes.includes(item.statecode)))
      }
    } else if (accessupto === 'State') {
      for (const district of response) {
        const fbmdr = cursor.find((fbmdr) => fbmdr.districtcode === district.districtcode);
        if (fbmdr) {
          data.push({ ...district.__data, fbmdr: fbmdr.fbmdr, cbmdr: fbmdr.cbmdr, percent: Math.round(fbmdr.percent) })
          
        } else {
          data.push({ ...district.__data, fbmdr: 0, cbmdr: 0, percent: 0 })
        }
      }
      if (districtcodes && districtcodes.length) {
        //console.log.log("---->data",data)
        return (data.filter((item) => districtcodes.includes(item.districtcode)))
      }
    } else if (accessupto === 'District') {
      // console.log("---->response",response)
      // console.log("---->fbmdr",cursor)
      for (const block of response) {
        const fbmdr = cursor.find(fbmdr => fbmdr.subdistrictcode === block.subdistrictcode);
        // console.log(fbmdr)
        if (fbmdr) {
          // console.log("----> push",{ ...block.__data, fbmdr: fbmdr.fbmdr, cbmdr: fbmdr.cbmdr, percent: Math.round(fbmdr.percent) })
          data.push({ ...block.__data, fbmdr: fbmdr.fbmdr, cbmdr: fbmdr.cbmdr, percent: Math.round(fbmdr.percent) })
        } else {
          data.push({ ...block.__data, fbmdr: 0, cbmdr: 0, percent: 0 })
        }
      }
      if (subdistrictcodes && subdistrictcodes.length) {
        return (data.filter(item => subdistrictcodes.includes(item.subdistrictcode)))
      }
    }
    return data

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
