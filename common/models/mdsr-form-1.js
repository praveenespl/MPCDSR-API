'use strict';
const jwt = require('jsonwebtoken');
var ObjectId = require('mongodb').ObjectID;
const app = require("../../server/server");
const { permittedCrossDomainPolicies } = require('helmet');
module.exports = function (Mdsrform1) {
  Mdsrform1.observe('before save', async (ctx) => {
    if (ctx.isNewInstance) {
      const { state_id, district_id, block_id, village_id, facility_id } = ctx.instance;
      let newId = `${state_id.statecode}${district_id.districtcode}${block_id.subdistrictcode}`;
      if (village_id && village_id.villagecode) {
        newId += `${village_id.villagecode}`
      }
      ctx.instance.uuid = `${newId}${Math.floor(Math.random() * 99999)}`;
    }

    return;

  })
  Mdsrform1.getDashboardData = async function (params) {
    if(params.dateWise==="death_date_time"){
      params.death_date_time.$gte = new Date(params.death_date_time.$gte);
      params.death_date_time.$lte = new Date(params.death_date_time.$lte);
      delete params.dateWise;
    }else{
    params.updatedAt.$gte = new Date(params.updatedAt.$gte);
    params.updatedAt.$lte = new Date(params.updatedAt.$lte);
    delete params.dateWise;
    }
    var self = this;
    var Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);
    console.log("get dashboard data",params)
    let cursor = await Mdsrform1Collection.aggregate(

      // Pipeline
      [
        // Stage 1
        {
          $match: params
        },

        // Stage 2
        {
          $lookup: {
            from: "mdsr_form_4",
            localField: "_id",
            foreignField: "deceased_women_id_new",
            as: "mdsrForm4"
          }
        },

        // Stage 3
        {
          $lookup: {
            from: "mdsr_form_5",
            localField: "_id",
            foreignField: "deceased_women_id_new",
            as: "mdsrForm5"
          }
        },

        // Stage 4
        {
          $project: {
            is_maternal_death: 1,
            _id: 1,
            mdsrForm4: {
              $cond: {
                if: {
                  $size: "$mdsrForm4"
                },
                then: {
                  $size: "$mdsrForm4"
                },
                else: 0
              }
            },
            mdsrForm5: {
              $cond: {
                if: {
                  $size: "$mdsrForm5"
                },
                then: {
                  $size: "$mdsrForm5"
                },
                else: 0
              }
            }
          }
        },

        // Stage 5
        {
          $group: {
            _id: {},
            totDeath: {
              $sum: 1
            },
            totMaternalDeath: {
              $sum: {
                $cond: [{
                  $eq: ["$is_maternal_death", true]
                }, 1, 0]
              }
            },
            mdsrForm4: {
              $sum: {
                $cond: [{
                  $ne: ["$mdsrForm4", 0]
                }, 1, 0]
              }
            },
            mdsrForm5: {
              $sum: {
                $cond: [{
                  $ne: ["$mdsrForm5", 0]
                }, 1, 0]
              }
            }
          }
        }
      ]
    ).toArray()

    return cursor;
  }

  Mdsrform1.remoteMethod("getDashboardData", {
    description: "get dashboard Data",
    accepts: [{
      arg: "params",
      type: "object"
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  });

  Mdsrform1.getExpectedVsActual = async function (params) {
    let self = this;
    const { statecodes } = params;
    let Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);
    let obj = {

    }
    if (params.type === "getDistricts") {
      obj.type = "getDistricts";
      const districtModel = app.models.district;
      var response = await districtModel.find({ where: { stateCode: params.statecodes[0] } });
    } else {
      obj.type = "getStates"
      const stateModel = app.models.state;
      var result = await stateModel.find({});
    }
    const expectedReporting = await app.models.target.find({
      where: {
        "year": params.year
      },
      fields: {
        "state": true,
        "year": true,
        "estimate": true
      }
    })

    let match = {
      death_date_time: {
        "$gte": new Date("2019-01-01"),
        "$lte": new Date(params.toDate)
      }
    }

    let group = {
      _id: {
        "statename": "$state_id.statename",
        "statecode": "$state_id.statecode"
      },
      actual: {
        $sum: 1
      }
    }

    let project = {
      "statecode": "$_id.statecode",
      "state": "$_id.statename",
      "actual": 1,
      _id: 0
    }

    if (params.type === "getDistricts") {
      if (params.statecode) {
        if (params.statecode.length !== 0) {
          match["state_id.statecode"] = {
            $in: params.statecode
          }
        }
      }
      group["_id"]["districtcode"] = "$district_id.districtcode";
      project["districtcode"] = "$_id.districtcode";
    }

    let actualReporting = await Mdsrform1Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: match
        },
        // Stage 2
        {
          $group: group
        },
        // Stage 3
        {
          $project: project
        }
      ],
      // Options
      {
        cursor: {
          batchSize: 50
        }
      }
    ).toArray()

    let data = [];
    result.forEach((item, i) => {
      let obj = {};
      if (params.type === "getStates") {
        const foundState = actualReporting.find(state => state.statecode === item.statecode);
        obj = {
          "statecode": item.statecode,
          "state": item.statename,
          "actual": foundState ? foundState.actual : 0
        }
        const foundStateEstimate = expectedReporting.find(state => state.state.statecode === item.statecode);
        obj["expected"] = foundStateEstimate ? foundStateEstimate.estimate : 0;
      } else if (params.type === "getDistricts") {
        const foundDistrict = actualReporting.find((district) => district.districtcode == item.districtcode);
        obj = {
          "districtcode": item.districtcode,
          "district": item.districtname,
          "statecode": foundDistrict ? foundDistrict.statecode : '',
          "stateName": foundDistrict ? foundDistrict.state : '',
          "actual": foundDistrict ? foundDistrict.actual : 0
        }
        const foundDistrictEstimate = expectedReporting.find(district => district.districtCode === item.districtcode);
        obj["expected"] = foundDistrictEstimate ? foundDistrictEstimate.estimate : 0;

      }
      data.push(obj);

    });

    if (statecodes && statecodes.length) {
      return data.filter(item => statecodes.includes(item.statecode));
    }
    return data
  }

  Mdsrform1.remoteMethod("getExpectedVsActual", {
    "description": "",
    description: "get expected and actual maternal death",
    accepts: [{
      arg: "params",
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

  Mdsrform1.getFormsData = async function (params) {
    if (params.deceased_women_id != undefined) {
      params.deceased_women_id = ObjectId(params.deceased_women_id);
    }

    var self = this;
    var Mdsrform1Collection = self
      .getDataSource()
      .connector.collection(Mdsrform1.modelName);
    let cursor = await Mdsrform1Collection.aggregate(

      // Pipeline
      [
        // Stage 1
        {
          $match: {

          }
        },

        // Stage 2
        {
          $lookup: {
            "from": "mdsr_form_6",
            "localField": "_id",
            "foreignField": "deceased_women_id",
            "as": "mdsr6"
          }
        },

        // Stage 3
        {
          $lookup: {
            "from": "mdsr_form_4",
            "localField": "_id",
            "foreignField": "deceased_women_id_new",
            "as": "mdsr4"
          }
        },

        // Stage 4
        {
          $lookup: {
            "from": "mdsr_form_5",
            "localField": "_id",
            "foreignField": "deceased_women_id_new",
            "as": "mdsr5"
          }
        },

        // Stage 5
        {
          $project: {
            deceasedWomen: "$_id",
            state_id: "$state_id",
            district_id: "$district_id",
            block_id: "$block_id",
            place_of_death: "$place_of_death",
            husband_name: "$husband_name",
            mobile: "$mobile",
            mdsr4Size: { $size: "$mdsr4" },
            mdsr5Size: { $size: "$mdsr5" },
            mdsr4: "$mdsr4",
            mdsr5: "$mdsr5",
            mdsr6: "$mdsr6"
          }
        },

        // Stage 6
        {
          $group: {
            _id: {
              deceasedWomen: "$deceasedWomen",
              place_of_death: "$place_of_death",
              husband_name: "$husband_name",
              mobile: "$mobile"
            },
            form4: {
              $push: {
                $cond: [
                  { $eq: ["$mdsr4Size", 1] }, { $arrayElemAt: ["$mdsr4", 0] }, { $arrayElemAt: ["$mdsr5", 0] }
                ]
              }
            },
            form6: { $addToSet: "$mdsr6" },
            form5: { $addToSet: "$mdsr5" }
          }
        },

        // Stage 7
        {
          $project: {
            deceased_women_id: "$_id.deceasedWomen",
            place_of_death: "$_id.place_of_death",
            husband_name: "$_id.husband_name",
            mobile: "$_id.mobile",
            formSize: { $size: "$form4" },
            form4: { $arrayElemAt: ["$form4", 0] },
            generalinformation: { $ifNull: [{ $arrayElemAt: ["$form4.general_information", 0] }, { $arrayElemAt: ["$form4.generalinformation", 0] }] },
            patient_history: { $ifNull: [{ $arrayElemAt: ["$form4.patient_history", 0] }, { $arrayElemAt: ["$form4.module1", 0] }] },
            on_admission: { $arrayElemAt: ["$form4.on_admission", 0] },
            form6: { $arrayElemAt: ["$form6", 0] },
            form5: { $arrayElemAt: [{ $arrayElemAt: ["$form5", 0] }, 0] },
            mdsrForm1: { $ifNull: [{ $arrayElemAt: ["$form4.deceased_women_id", 0] }, { $arrayElemAt: ["$form5.deceased_women_id", 0] }] }
          }
        },

        // Stage 8
        {
          $match: {
            formSize: 1
          }
        },
        {
          $project: {

            deceased_women_id: 1,
            place_of_death: 1,
            husband_name: 1,
            mobile: "$_id.mobile",
            formSize: 1,
            form4: 1,
            generalinformation: 1,
            patient_history: 1,
            on_admission: 1,
            form6: 1,
            mdsrForm1: 1,
            religion: "$form5.module1.profile.religion",
            caste: "$form5.module1.profile.caste",
            death_date_time: { $ifNull: ["$patient_history.death_date_time", "$generalinformation.death_date_time"] },
            age: { $ifNull: ["$generalinformation.age", "$patient_history.background_info.age"] },
            state_id: { $ifNull: ["$generalinformation.state", "$generalinformation.state_id"] },
            district_id: { $ifNull: ["$generalinformation.district", "$generalinformation.district_id"] },
            block_id: { $ifNull: ["$generalinformation.block", "$generalinformation.block_id"] },
            village_id: { $ifNull: ["$generalinformation.village", "$generalinformation.village_id"] },
            facility_id: { $ifNull: ["$generalinformation.facility", "$generalinformation.facility_id"] },
            gravida: { $ifNull: ["$on_admission.gravida", "$patient_history.gpla.gravida"] },
            para: { $ifNull: ["$on_admission.para", "$patient_history.gpla.para"] },
            alive_children_total: { $ifNull: ["$on_admission.alive_children_total", "$patient_history.gpla.alive_children_total"] },
            infant_outcome: { $ifNull: ["$on_admission.infant_outcome", "$patient_history.gpla.infant_outcome"] },
            total_abortion: { $ifNull: ["$on_admission.total_abortion", "$patient_history.gpla.total_abortion"] },
            induced_abortion: { $ifNull: ["$on_admission.induced_abortion", "$patient_history.gpla.induced_abortion"] },
            spontaneous_abortion: { $ifNull: ["$on_admission.spontaneous_abortion", "$patient_history.gpla.spontaneous_abortion"] },
            investigators: "$form5.generalinformation.investigators"
          }
        },
        {
          $match: params
        }
      ]

      // Created with 3T MongoChef, the GUI for MongoDB - http://3t.io/mongochef

    ).toArray()

    return cursor
    //return cb(false, [])
  }
  Mdsrform1.remoteMethod("getFormsData", {
    description: "get Form4 data if 4 not exist then Form5 Data",
    accepts: [{
      arg: "params",
      type: "object"
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  });

  Mdsrform1.getNotificationVsReviewData = async function (params) {
    var self = this;
    var Mdsrform1Collection = self
      .getDataSource()
      .connector.collection(Mdsrform1.modelName);
    var accessGroup = {};
    if (params.reporting_level != "" && params.accessupto != "Block") {

    } else {
      if (params.accessupto == "National") {
        accessGroup = {
          state_id: "$state_id"
        }

      } else if (params.accessupto == "State") {
        accessGroup = {
          state_id: "$state_id",
          district_id: "$district_id"
        }

      } else if (params.accessupto == "District") {
        accessGroup = {
          state_id: "$state_id",
          district_id: "$district_id",
          block_id: "$block_id"
        }

      } else if (params.accessupto == "Block") {
        accessGroup = {
          block_id: "$block_id"
        }

      }
    }
    let cursor = await Mdsrform1Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: params.objMatch
        },
        // Stage 2
        {
          $lookup: {
            "from": "mdsr_form_5",
            "localField": "_id",
            "foreignField": "deceased_women_id_new",
            "as": "mdsr5"
          }
        },
        // Stage 3
        {
          $lookup: {
            "from": "mdsr_form_4",
            "localField": "_id",
            "foreignField": "deceased_women_id_new",
            "as": "mdsr4"
          }
        },
        // Stage 4
        {
          $project: {
            deceased_women_id: "$_id",
            state_id: "$state_id",
            district_id: "$district_id",
            block_id: "$block_id",
            state_id: "$state_id",
            place_of_death: "$place_of_death",
            husband_name: "$husband_name",
            mobile: "$mobile",
            mdsr4Size: { $size: "$mdsr4" },
            mdsr5Size: { $size: "$mdsr5" }
          }
        },
        // Stage 5
        {
          $group: {
            _id: accessGroup,
            notifiedDeath: { $sum: 1 },
            form4: {
              $sum: {

                $cond: [{
                  $and: [
                    { $eq: ["$mdsr4Size", 1] },
                    { $eq: ["$mdsr5Size", 0] }
                  ]
                }, 1, 0]
              }
            },
            form5: {
              $sum: {

                $cond: [{
                  $and: [
                    { $eq: ["$mdsr4Size", 0] },
                    { $eq: ["$mdsr5Size", 1] }
                  ]
                }, 1, 0]
              }
            },
            both: {
              $sum: {

                $cond: [{
                  $and: [
                    { $eq: ["$mdsr4Size", 1] },
                    { $eq: ["$mdsr5Size", 1] }
                  ]
                }, 1, 0]
              }
            }
          }
        }
      ]
      // Created with 3T MongoChef, the GUI for MongoDB - http://3t.io/mongochef
    ).toArray()

    return cursor

  }
  Mdsrform1.remoteMethod("getNotificationVsReviewData", {
    description: "Get Notification vs Review Data",
    accepts: [{
      arg: "params",
      type: "object"
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  });

  // total maternal deaths notification for state district done by ravindra on 04-01-2020
  Mdsrform1.getNotificationCount = async function (params) {
    var self = this;
    var Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);
    if(params.dateWise==="death_date_time"){
      params.death_date_time.$gte = new Date(params.death_date_time.$gte);
      params.death_date_time.$lte = new Date(params.death_date_time.$lte);
      delete params.dateWise;
    }else{
    params.updatedAt.$gte = new Date(params.updatedAt.$gte);
    params.updatedAt.$lte = new Date(params.updatedAt.$lte);
    delete params.dateWise;
    }
    let cursor = await Mdsrform1Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: params
        },
        // Stage 3
        {
          $group: {
            "_id": {},
            "CB": {
              "$sum": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$or": [
                          {
                            "$eq": [
                              "$place_of_death",
                              "Home"
                            ]
                          },
                          {
                            "$eq": [
                              "$place_of_death",
                              "Transit"
                            ]
                          },
                          {
                            "$eq": [
                              "$place_of_death",
                              "Other"
                            ]
                          }
                        ]
                      },
                      {
                        "$eq": [
                          "$is_maternal_death",
                          true
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            "FB": {
              "$sum": {
                "$cond": [
                  {
                    "$and": [
                      // {
                      //   "$or": [
                      {
                        "$eq": [
                          "$place_of_death",
                          "Health Facility"
                        ]
                      },
                      //   ]
                      // },
                      {
                        "$eq": [
                          "$is_maternal_death",
                          true
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },

      ]
      // Created with 3T MongoChef, the GUI for MongoDB - http://3t.io/mongochef
    ).toArray()

    return cursor;

  }
  Mdsrform1.remoteMethod("getNotificationCount", {
    description: "Get Notification vs Review Data",
    accepts: [{
      arg: "params",
      type: "object"
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  });

  Mdsrform1.getNotificationDetails = async function (params) {
    var self = this;
    var Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);
    params.updatedAt.$gte = new Date(params.updatedAt.$gte);
    params.updatedAt.$lte = new Date(params.updatedAt.$lte);
    params['is_maternal_death'] = true;
    //params['block_id.subdistrictcode']={"$in":params.subdistrictcode}

    let cursor = await Mdsrform1Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: params
        }
      ]
      // Created with 3T MongoChef, the GUI for MongoDB - http://3t.io/mongochef
    ).toArray()
    return cursor;
  }
  Mdsrform1.remoteMethod("getNotificationDetails", {
    description: "Get Notification Details",
    accepts: [{
      arg: "params",
      type: "object"
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  });

  Mdsrform1.getMaternalCauseOfdeaths = async function (params) {
    let self = this;

    let Mdsrform4Collection = self.getDataSource().connector.collection(Mdsrform1.app.models.MdsrForm4.modelName);
    let Mdsrform5Collection = self.getDataSource().connector.collection(Mdsrform1.app.models.MdsrForm5.modelName);
    const { fromDate, toDate, accessUpto, districtcodes, statecodes, subdistrictcodes } = params;
    const where = {
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
    }
    const where1 = { ...where }
    if (accessUpto == "Block") {
      block_id = params.where.block_id;
    } else if (accessUpto == "District") {
      where["general_information.district.districtcode"] = { $in: districtcodes };
      where1["generalinformation.district_id.districtcode"] = { $in: districtcodes };
      if (subdistrictcodes && subdistrictcodes.length) {
        where["general_information.block.subdistrictcode"] = { $in: subdistrictcodes };
        where1["generalinformation.block_id.subdistrictcode"] = { $in: districtcodes };
      }
    } else if (accessUpto == "State") {
      where["general_information.state.statecode"] = { $in: statecodes };
      where1["generalinformation.state_id.statecode"] = { $in: statecodes };
      if (districtcodes && districtcodes.length) {
        where["general_information.district.districtcode"] = { $in: districtcodes };
        where1["generalinformation.district_id.districtcode"] = { $in: districtcodes };
      }
    } else if (accessUpto == "National") {
      if (statecodes && statecodes.length) {
        where["general_information.state.statecode"] = { $in: statecodes };
        where1["generalinformation.state_id.statecode"] = { $in: statecodes };
      }
    }
    const project = {
      _id: 0,
      abortion: 1,
      Hypertension: 1,
      sepsis: 1,
      haemorrhage: 1,
      obstructedLabour: 1,
      IndirectCause: 1,
      OtherDirectCause: 1,
      Dengue: 1,
      RespiratoryDisorders: 1,
      HIV_AIDS: 1,
      H1N1ViralDisease: 1,
      Malaria: 1,
      Enhephalitis: 1,
      OtherInDirectCauses: 1
    }

    const group = {
      _id: null,
      abortion: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Abortion"] }, 1, 0
          ]
        }
      },
      Hypertension: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Essential Hypertension"] }, 1, 0
          ]
        }
      },
      sepsis: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Puerperal sepsis"] }, 1, 0
          ]
        }
      },
      haemorrhage: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Postpartum haemorrhage"] }, 1, 0
          ]
        }
      },
      obstructedLabour: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Chorioamnionitis without or with obstructed labour / prolonged labour"] }, 1, 0
          ]
        }
      },
      IndirectCause: {
        $sum: {
          $cond: [
            {
              "$or": [
                { "$eq": ["$icd_indirect_category", "Anaemia"] },
                { "$eq": ["$icd_indirect_category", "Cardiac disorders"] },
                { "$eq": ["$icd_indirect_category", "Endocrinal Disorders"] },
                { "$eq": ["$icd_indirect_category", "Infections/ Infestations"] },
                { "$eq": ["$icd_indirect_category", "Liver Disorders"] },
                { "$eq": ["$icd_indirect_category", "Neurological Disorders"] },
                { "$eq": ["$icd_indirect_category", "Renal disorders"] },
                { "$eq": ["$icd_indirect_category", "Respiratory Disorders"] },
              ]
            }, 1, 0
          ]
        }
      },
      OtherDirectCause: {
        $sum: {
          $cond: [
            {
              $and: [
                { $ne: ["$icd_category", "Abortion"] },
                { $ne: ["$icd_category", "Essential Hypertension"] },
                { $ne: ["$icd_category", "Puerperal sepsis"] },
                { $ne: ["$icd_category", "Postpartum haemorrhage"] },
                { $ne: ["$icd_category", "Chorioamnionitis without or with obstructed labour / prolonged labour"] }
              ]
            }, 1, 0
          ]
        }
      },
      Dengue: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_sub_category", "Dengue"] }, 1, 0
          ]
        }
      },
      RespiratoryDisorders: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_category", "Respiratory Disorders"] }, 1, 0
          ]
        }
      },
      HIV_AIDS: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_sub_category", "HIV / AIDS"] }, 1, 0
          ]
        }
      },
      H1N1ViralDisease: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_sub_category", "H1N1 viral Disease"] }, 1, 0
          ]
        }
      },
      Malaria: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_sub_category", "Malaria"] }, 1, 0
          ]
        }
      },
      Enhephalitis: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_sub_category", "Enhephalitis"] }, 1, 0
          ]
        }
      },
      OtherInDirectCauses: {
        $sum: {
          $cond: [
            {
              $and: [
                { $ne: ["$icd_indirect_sub_category", "Dengue"] },
                { $ne: ["$icd_indirect_sub_category", "HIV / AIDS"] },
                { $ne: ["$icd_indirect_sub_category", "H1N1 viral Disease"] },
                { $ne: ["$icd_indirect_sub_category", "Malaria"] },
                { $ne: ["$icd_indirect_sub_category", "Enhephalitis"] },
                { $ne: ["$icd_indirect_sub_category", "Adult respiratory distress syndrome"] },
                { $ne: ["$icd_indirect_sub_category", "Tuberculosis"] },
                { $ne: ["$icd_indirect_sub_category", "Pneumonia"] },
                { $ne: ["$icd_indirect_sub_category", "Pulmonary embolism"] }
              ]
            }, 1, 0
          ]
        }
      }
    };

    const form4Data = await Mdsrform4Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: where
        },

        // Stage 2
        {
          $project: {
            statecode: "$general_information.state.statecode",
            statename: "$general_information.state.statename",
            icd_category: "$cause_of_death.direct.category",
            icd_indirect_category: "$cause_of_death.indirect.category",
            icd_indirect_sub_category: '$cause_of_death.indirect.sub_category'
          }
        },


        // Stage 3
        {
          $group: group
        },
        {
          $project: project
        }
      ],

      // Options
      {
        cursor: {
          batchSize: 50
        },

        allowDiskUse: true
      }

      // Created with 3T MongoChef, the GUI for MongoDB - https://3t.io/mongochef

    ).toArray();

    const form5Data = await Mdsrform5Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: where1
        },

        // Stage 2
        {
          $project: {
            statecode: "$generalinformation.state_id.statecode",
            statename: "$generalinformation.state_id.statename",
            month: { "$month": "$createdAt" },
            year: { "$year": "$createdAt" },
            icd_category: "$other.cause_of_death.direct.category",
            icd_indirect_category: "$other.cause_of_death.indirect.category",
            icd_indirect_sub_category: "$other.cause_of_death.indirect.sub_category"
          }
        },

        // Stage 3
        {
          $group: group
        },
        {
          $project: project
        }
      ],

      // Options
      {
        cursor: {
          batchSize: 50
        },

        allowDiskUse: true
      }

      // Created with 3T MongoChef, the GUI for MongoDB - https://3t.io/mongochef

    ).toArray()


    let data = [];
    let obj = {};

    if ((form4Data || form5Data) && (form5Data.length && form4Data.length)) {
      obj['abortion'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].abortion + form5Data[0].abortion : form4Data && form4Data.length ? form4Data[0].abortion : form5Data[0].abortion ? form5Data[0].abortion : 0;
      obj['Hypertension'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].Hypertension + form5Data[0].Hypertension : form4Data && form4Data.length ? form4Data[0].Hypertension : form5Data[0].Hypertension;
      obj['sepsis'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].sepsis + form5Data[0].sepsis : form4Data && form4Data.length ? form4Data[0].sepsis : form5Data[0].sepsis;
      obj['haemorrhage'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].haemorrhage + form5Data[0].haemorrhage : form4Data && form4Data.length ? form4Data[0].haemorrhage : form5Data[0].haemorrhage;
      obj['obstructedLabour'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].obstructedLabour + form5Data[0].obstructedLabour : form4Data && form4Data.length ? form4Data[0].obstructedLabour : form5Data[0].obstructedLabour;
      obj['OtherDirectCause'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].OtherDirectCause + form5Data[0].OtherDirectCause : form4Data && form4Data.length ? form4Data[0].OtherDirectCause : form5Data[0].OtherDirectCause;

      obj['Dengue'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].Dengue + form5Data[0].Dengue : form4Data && form4Data.length ? form4Data[0].Dengue : form5Data[0].Dengue;
      obj['RespiratoryDisorders'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].RespiratoryDisorders + form5Data[0].RespiratoryDisorders : form4Data && form4Data.length ? form4Data[0].RespiratoryDisorders : form5Data[0].RespiratoryDisorders;
      obj['H1N1ViralDisease'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].H1N1ViralDisease + form5Data[0].H1N1ViralDisease : form4Data && form4Data.length ? form4Data[0].H1N1ViralDisease : form5Data[0].H1N1ViralDisease;
      obj['HIV_AIDS'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].HIV_AIDS + form5Data[0].HIV_AIDS : form4Data && form4Data.length ? form4Data[0].HIV_AIDS : form5Data[0].HIV_AIDS;
      obj['Malaria'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].Malaria + form5Data[0].Malaria : form4Data && form4Data.length ? form4Data[0].Malaria : form5Data[0].Malaria;
      obj['Enhephalitis'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].Enhephalitis + form5Data[0].Enhephalitis : form4Data && form4Data.length ? form4Data[0].Enhephalitis : form5Data[0].Enhephalitis;
      obj['OtherInDirectCauses'] = form4Data && form4Data.length && form5Data && form5Data.length ? form4Data[0].OtherInDirectCauses + form5Data[0].OtherInDirectCauses : form4Data && form4Data.length ? form4Data[0].OtherInDirectCauses : form5Data[0].OtherInDirectCauses;
    } else {
      obj = {
        abortion: 0,
        Hypertension: 0,
        sepsis: 0,
        haemorrhage: 0,
        obstructedLabour: 0,
        OtherDirectCause: 0,
        Dengue: 0,
        HIV_AIDS: 0,
        H1N1ViralDisease: 0,
        Malaria: 0,
        Enhephalitis: 0,
        OtherInDirectCauses: 0,
        RespiratoryDisorders: 0
      }
    }
    data.push(obj);
    return data;

  }

  Mdsrform1.remoteMethod("getMaternalCauseOfdeaths", {
    "description": "",
    description: "getMaternalCauseOfdeaths",
    accepts: [{
      arg: "params",
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


  Mdsrform1.getMostAndLeastDistrictsDeaths = async function (params) {
    let self = this;
    let Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);
    let where = {};
    if (params.accessUpto == "State") {
      where['state_id.statecode'] = params.where.state_id;
      where['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
    } else if (params.accessUpto == "National") {
      where['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
    }

    let leastDistrcisDeaths = await Mdsrform1Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: where
        },
        // Stage 1
        {
          $group: {
            _id: {
              districtCode: "$district_id.districtcode",
              districtName: "$district_id.districtname"
            },
            count: { $sum: 1 }
          }
        },

        // Stage 2
        {
          $sort: {
            count: 1
          }
        },

        // Stage 3
        {
          $limit: 5
        },

        // Stage 4
        {
          $project: {
            _id: 0,
            category: "$_id.districtName",
            "column-1": "$count"
          }
        }

      ]
      // Created with 3T MongoChef, the GUI for MongoDB - http://3t.io/mongochef
    ).toArray()

    let mostDistrcisDeaths = await Mdsrform1Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: where
        },
        // Stage 1
        {
          $group: {
            _id: {
              districtCode: "$district_id.districtcode",
              districtName: "$district_id.districtname"
            },
            count: { $sum: 1 }
          }
        },

        // Stage 2
        {
          $sort: {
            count: -1
          }
        },

        // Stage 3
        {
          $limit: 15
        },

        // Stage 4
        {
          $project: {
            _id: 0,
            "category": "$_id.districtName",
            "column-1": "$count"
          }
        }

      ]
      // Created with 3T MongoChef, the GUI for MongoDB - http://3t.io/mongochef
    ).toArray()

    const results = { leastDistrcisDeaths: leastDistrcisDeaths, mostDistrcisDeaths: mostDistrcisDeaths }
    return results
  }

  Mdsrform1.remoteMethod("getMostAndLeastDistrictsDeaths", {
    "description": "",
    description: "getMostAndLeastDistrictsDeaths",
    accepts: [{
      arg: "params",
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


  Mdsrform1.getDeathsWhereCbmdsrAndFbmdsrConducted = async function (params) {
    let self = this;
    let Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);
    let masterAPIArg = {};
    let where = {};
    let groupUnderscoreId = {};
    let project = {};
    where[params.dateWise] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
    const { statecodes, districtcodes, subdistrictcodes } = params.where;
    if (params.accessUpto == "National") {
      masterAPIArg['type'] = "getStates";
      groupUnderscoreId = {
        statecode: "$state_id.statecode",
        statename: "$state_id.statename"
      }
      if (statecodes && statecodes.length) {
        where["state_id.statecode"] = { $in: statecodes };

      }
      project = {
        _id: 0,
        statecode: "$_id.statecode",
        statename: "$_id.statename",
        whereCBMDSRConducted: 1,
        whereFBMDSRConducted: 1,
        totalMDs: 1,
        reported: 1
      }
    } else if (params.accessUpto == "State") {
      masterAPIArg['type'] = "getDistricts";
      masterAPIArg['statecode'] = params.where['statecode'];
      where['state_id.statecode'] = params.where['statecode'];
      if (districtcodes && districtcodes.length) {
        where["district_id.districtcode"] = { $in: districtcodes };
      }
      groupUnderscoreId = {
        statename: "$state_id.statename",
        districtcode: "$district_id.districtcode",
        districtname: "$district_id.districtname"
      }
      project = {
        _id: 0,
        statename: "$_id.statename",
        districtcode: "$_id.districtcode",
        districtname: "$_id.districtname",
        whereCBMDSRConducted: 1,
        whereFBMDSRConducted: 1,
        totalMDs: 1,
        reported: 1
      }
    } else if (params.accessUpto == "District") {
      masterAPIArg['type'] = "getSubDistricts";
      masterAPIArg['districtcode'] = params.where['districtcode'];
      where['district_id.districtcode'] = params.where['districtcode'];
      if (subdistrictcodes && subdistrictcodes.length) {
        where["block_id.subdistrictcode"] = { $in: subdistrictcodes }
      }
      groupUnderscoreId = {
        subdistrictcode: "$block_id.subdistrictcode",
        subdistrictname: "$block_id.subdistrictname"
      }
      project = {
        _id: 0,
        subdistrictcode: "$_id.subdistrictcode",
        subdistrictname: "$_id.subdistrictname",
        whereCBMDSRConducted: 1,
        whereFBMDSRConducted: 1,
        totalMDs: 1,
        reported: 1
      }
    } else if (params.accessUpto == "Block") {
      where['block_id.subdistrictcode'] = params.where['subdistrictcode'];
      groupUnderscoreId = {
        subdistrictcode: "$block_id.subdistrictcode",
        subdistrictname: "$block_id.subdistrictname"
      }
      project = {
        _id: 0,
        subdistrictcode: "$_id.subdistrictcode",
        subdistrictname: "$_id.subdistrictname",
        whereCBMDSRConducted: 1,
        whereFBMDSRConducted: 1,
        totalMDs: 1,
        reported: 1
      }
    }
    console.log("get death where cbmdsr and fbmdsr conducted---->",where)
    let cursor = await Mdsrform1Collection.aggregate(
      // Pipeline
      [
        {
          $match: where
        },
        // Stage 1
        {
          $group: {
            _id: groupUnderscoreId,
            reported: { $sum: 1 },
            "totalMDs": {
              $sum: {
                $cond: [
                  { $eq: ["$is_maternal_death", true] }, 1, 0
                ]
              }
            },
            "whereCBMDSRConducted": {
              "$sum": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$or": [
                          {
                            "$eq": [
                              "$place_of_death",
                              "Home"
                            ]
                          },
                          {
                            "$eq": [
                              "$place_of_death",
                              "Transit"
                            ]
                          },
                          {
                            "$eq": [
                              "$place_of_death",
                              "Other"
                            ]
                          }
                        ]
                      },
                      {
                        "$eq": [
                          "$is_maternal_death",
                          true
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            "whereFBMDSRConducted": {
              "$sum": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$or": [
                          {
                            "$eq": [
                              "$place_of_death",
                              "Health Facility"
                            ]
                          }
                        ]
                      },
                      {
                        "$eq": [
                          "$is_maternal_death",
                          true
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },

        // Stage 2
        {
          $sort: {
            whereCBMDSRConducted: -1,
            whereFBMDSRConducted: -1
          }
        },

        // Stage 3
        {
          $project: project
        }

      ],
      // Options
      {
        cursor: {
          batchSize: 50
        }
      }
    ).toArray()
    let response = []
    cursor.forEach((i) => {
      let obj = {}
      if (params.accessUpto === "National") {
        obj = {
          "category": i.statename,
          "statecode": i.statecode,
          "column-1": i.whereFBMDSRConducted,
          "column-2": i.whereCBMDSRConducted,
          "totalMDs": i.totalMDs,
          "reported": i.reported
        }
        response.push(obj)
      } else if (params.accessUpto == "State") {
        obj = {
          "category": i.districtname,
          "districtcode": i.districtcode,
          "column-1": i.whereFBMDSRConducted,
          "column-2": i.whereCBMDSRConducted,
          "totalMDs": i.totalMDs,
          "reported": i.reported
        }
        response.push(obj)
      } else if (params.accessUpto == "District") {
        obj = {
          "category": i.subdistrictname,
          "subdistrictcode": i.subdistrictcode,
          "column-1": i.whereFBMDSRConducted,
          "column-2": i.whereCBMDSRConducted,
          "totalMDs": i.totalMDs,
          "reported": i.reported
        }
        response.push(obj)
      } else if (params.accessUpto == "Block") {
        obj = {
          "category": i.subdistrictname,
          "subdistrictcode": i.subdistrictcode,
          "column-1": i.whereCBMDSRAndFBMDSRConducted,
          "column-2": i.whereCBMDSRAndFBMDSRConducted,
          "totalMDs": i.totalMDs,
          "reported": i.reported
        }
        response.push(obj);
      }
    }
    )
    return response


  }

  Mdsrform1.remoteMethod("getDeathsWhereCbmdsrAndFbmdsrConducted", {
    "description": "",
    description: "get getDeathsWhereCbmdsrAndFbmdsrConducted",
    accepts: [{
      arg: "params",
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

  Mdsrform1.getMaternalCauseOfdeathsFor6Months = async function (params) {
    let self = this;
    let Mdsrform4Collection = self.getDataSource().connector.collection(Mdsrform1.app.models.MdsrForm4.modelName);
    let Mdsrform5Collection = self.getDataSource().connector.collection(Mdsrform1.app.models.MdsrForm5.modelName);
    //let block_id = { subdistrictcode: undefined }, district_id = { districtcode: undefined }, state_id = { statecode: undefined };
    const { fromDate, toDate, accessUpto, statecodes, districtcodes, datesArray, subdistrictcodes } = params;
    const where = {
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
    }

    const where1 = { ...where }

    if (accessUpto == "Block") {
      block_id = params.where.block_id;
    } else if (accessUpto == "District") {
      where["general_information.district.districtcode"] = { $in: districtcodes };
      where1["generalinformation.district_id.districtcode"] = { $in: districtcodes };
      if (subdistrictcodes && subdistrictcodes.length) {
        where["general_information.block.subdistrictcode"] = { $in: subdistrictcodes };
        where1["generalinformation.block_id.subdistrictcode"] = { $in: subdistrictcodes };
      }
    } else if (accessUpto == "State") {
      where["general_information.state.statecode"] = { $in: statecodes };
      where1["generalinformation.state_id.statecode"] = { $in: statecodes };
      if (districtcodes && districtcodes.length) {
        where["general_information.district.districtcode"] = { $in: districtcodes };
        where1["generalinformation.district_id.districtcode"] = { $in: districtcodes };
      }
    } else if (accessUpto == "National") {
      if (statecodes && statecodes.length) {
        where["general_information.state.statecode"] = { $in: statecodes };
        where1["generalinformation.state_id.statecode"] = { $in: statecodes };
      }
    }
    const project = {
      _id: 0,
      month: "$_id.month",
      year: "$_id.year",
      abortion: 1,
      Hypertension: 1,
      sepsis: 1,
      haemorrhage: 1,
      obstructedLabour: 1,
      IndirectCause: 1,
      OtherDirectCause: 1
    }
    const group = {
      _id: { "month": "$month", "year": "$year" },
      abortion: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Abortion"] }, 1, 0
          ]
        }
      },
      Hypertension: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Essential Hypertension"] }, 1, 0
          ]
        }
      },
      sepsis: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Puerperal sepsis"] }, 1, 0
          ]
        }
      },
      haemorrhage: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Postpartum haemorrhage"] }, 1, 0
          ]
        }
      },
      obstructedLabour: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Chorioamnionitis without or with obstructed labour / prolonged labour"] }, 1, 0
          ]
        }
      },
      IndirectCause: {
        $sum: {
          $cond: [
            {
              "$or": [
                { "$eq": ["$icd_indirect_category", "Anaemia"] },
                { "$eq": ["$icd_indirect_category", "Cardiac disorders"] },
                { "$eq": ["$icd_indirect_category", "Endocrinal Disorders"] },
                { "$eq": ["$icd_indirect_category", "Infections/ Infestations"] },
                { "$eq": ["$icd_indirect_category", "Liver Disorders"] },
                { "$eq": ["$icd_indirect_category", "Neurological Disorders"] },
                { "$eq": ["$icd_indirect_category", "Renal disorders"] },
                { "$eq": ["$icd_indirect_category", "Respiratory Disorders"] },
              ]
            }, 1, 0
          ]
        }
      },
      OtherDirectCause: {
        $sum: {
          $cond: [
            {
              $and: [
                { $ne: ["$icd_category", "Abortion"] },
                { $ne: ["$icd_category", "Essential Hypertension"] },
                { $ne: ["$icd_category", "Puerperal sepsis"] },
                { $ne: ["$icd_category", "Postpartum haemorrhage"] },
                { $ne: ["$icd_category", "Chorioamnionitis without or with obstructed labour / prolonged labour"] }
              ]
            }, 1, 0
          ]
        }
      }
    };


    const form4Data = await Mdsrform4Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: where
        },

        // Stage 2
        {
          $project: {
            statecode: "$general_information.state.statecode",
            statename: "$general_information.state.statename",
            month: 1,
            year: 1,
            icd_category: "$cause_of_death.direct.category",
            icd_indirect_category: "$cause_of_death.indirect.category"
          }
        },

        // Stage 3
        {
          $group: group
        },
        {
          $project: project
        }
      ],

      // Options
      {
        cursor: {
          batchSize: 50
        },

        allowDiskUse: true
      }

      // Created with 3T MongoChef, the GUI for MongoDB - https://3t.io/mongochef

    ).toArray()

    const form5Data = await Mdsrform5Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: where1
        },

        // Stage 2
        {
          $project: {
            statecode: "$generalinformation.state_id.statecode",
            statename: "$generalinformation.state_id.statename",
            month: { "$month": "$createdAt" },
            year: { "$year": "$createdAt" },
            icd_category: "$other.cause_of_death.direct.category",
            icd_indirect_category: "$other.cause_of_death.indirect.category"
          }
        },

        // Stage 3
        {
          $group: group
        },
        {
          $project: project
        }
      ],

      // Options
      {
        cursor: {
          batchSize: 50
        },

        allowDiskUse: true
      }

      // Created with 3T MongoChef, the GUI for MongoDB - https://3t.io/mongochef

    ).toArray()

    let data = [];
    if (form4Data || form5Data) {
      for (const form4 of form4Data) {
        let form5 = null;
        if (form5Data) {
          form5 = form5Data.find(form5 => form5.month === form4.month && form5.year === form5.year);
        }
        if (form5) {
          form4.abortion += form5.abortion;
          form4.Hypertension += form5.Hypertension;
          form4.sepsis += form5.sepsis;
          form4.haemorrhage += form5.haemorrhage;
          form4.obstructedLabour += form5.obstructedLabour;
          form4.IndirectCause += form5.IndirectCause;
          form4.OtherDirectCause += form5.OtherDirectCause;
        }
        data.push(form4);
      }
      if (form5Data) {
        for (const form5 of form5Data) {
          const found = data.find(item => item.month === form5.month && item.year === form5.year);
          if (!found) {
            data.push(form5)
          }
        }
      }
    }
    const finalRes = [];
    for (const dates of datesArray) {
      const found = data.find(item => item.month == dates.month && item.year == dates.year);
      let obj = {
        'category': found ? `${found.year}-${found.month}-01` : dates.fromDate,
        'column-1': found ? found.abortion : 0,
        'column-2': found ? found.Hypertension : 0,
        'column-3': found ? found.sepsis : 0,
        'column-4': found ? found.haemorrhage : 0,
        'column-5': found ? found.obstructedLabour : 0,
        'column-6': found ? found.IndirectCause : 0,
        'column-7': found ? found.OtherDirectCause : 0
      }
      finalRes.push(obj)
    }

    return finalRes;


  }

  Mdsrform1.remoteMethod("getMaternalCauseOfdeathsFor6Months", {
    "description": "",
    description: "getMaternalCauseOfdeathsFor6Months",
    accepts: [{
      arg: "params",
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


  Mdsrform1.getSubmittedFormsStatus = async function (params) {
    let self = this;
    let Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);
    let where1 = {
      "is_maternal_death": true
    };
    let where2 = {
      "is_maternal_death": true
    };
    let groupUnderscoreId = {};
    let project1 = {
      _id: 0,
      is_maternal_death: 1,
      mdsrForm2: {
        $cond: {
          if: { $gt: [{ $size: "$mdsrForm2" }, 0] },
          then: 1,
          else: 0
        }
      },
      mdsrForm3: {
        $cond: {
          if: { $gt: [{ $size: "$mdsrForm3" }, 0] },
          then: 1,
          else: 0
        }
      },
      mdsrForm4: {
        $cond: {
          if: { $gt: [{ $size: "$mdsrForm4" }, 0] },
          then: 1,
          else: 0
        }
      },
      mdsrForm5: {
        $cond: {
          if: { $gt: [{ $size: "$mdsrForm5" }, 0] },
          then: 1,
          else: 0
        }
      },
      mdsrForm6: {
        $cond: {
          if: { $gt: [{ $size: "$mdsrForm6" }, 0] },
          then: 1,
          else: 0
        }
      }

    };
    let project2 = {
      _id: 0,
      form1: 1,
      form2: 1,
      form3: 1,
      form4: 1,
      form5: 1,
      form6: 1,
    };
    let sort = {}
    where1["place_of_death"] = { $in: ['Home', 'Transit', 'Other'] }
    where1[params.dateWise] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
    if (params.where && params.where.state_id && params.where.state_id.statecode && params.where.state_id.statecode.length) {
      where1['state_id.statecode'] = { $in: params.where.state_id.statecode };
      where2['state_id.statecode'] = { $in: params.where.state_id.statecode };
    }
    where2["place_of_death"] = { $in: ['Health Facility'] }
    where2[params.dateWise] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
    if (params.accessUpto == "National") {
      groupUnderscoreId = {
        statecode: "$statecode",
        statename: "$statename"
      }
      project1['statename'] = "$state_id.statename";
      project1['statecode'] = "$state_id.statecode";
      project2['statename'] = "$_id.statename";
      project2['statecode'] = "$_id.statecode";
      sort['statename'] = 1;
    } else if (params.accessUpto == "State") {
      where1['state_id.statecode'] = params.where['statecode'];
      where2['state_id.statecode'] = params.where['statecode'];

      if (params.where && params.where.districtcodes && params.where.districtcodes.length) {
        where1['district_id.districtcode'] = { $in: params.where['districtcodes'] };
        where2['district_id.districtcode'] = { $in: params.where['districtcodes'] };
      }

      groupUnderscoreId = {
        districtcode: "$districtcode",
        districtname: "$districtname"
      }
      project1['districtname'] = "$district_id.districtname";
      project1['districtcode'] = "$district_id.districtcode";
      project2['districtname'] = "$_id.districtname";
      project2['districtcode'] = "$_id.districtcode";
      sort['districtname'] = 1;
    } else if (params.accessUpto == "District") {
      where1['district_id.districtcode'] = params.where['districtcode'];
      where2['district_id.districtcode'] = params.where['districtcode'];
      if (params.where && params.where.subdistrictcodes && params.where.subdistrictcodes.length) {
        where1['block_id.subdistrictcode'] = { $in: params.where['subdistrictcodes'] };
        where2['block_id.subdistrictcode'] = { $in: params.where['subdistrictcodes'] };
      }
      groupUnderscoreId = {
        subdistrictcode: "$subdistrictcode",
        subdistrictname: "$subdistrictname"
      }
      project1['subdistrictname'] = "$block_id.subdistrictname";
      project1['subdistrictcode'] = "$block_id.subdistrictcode";
      project2['subdistrictname'] = "$_id.subdistrictname";
      project2['subdistrictcode'] = "$_id.subdistrictcode";
      sort['subdistrictname'] = 1;
    } else if (params.accessUpto == "Block") {
      where1['block_id.subdistrictcode'] = params.where['subdistrictcode'];
      where2['block_id.subdistrictcode'] = params.where['subdistrictcode'];
      groupUnderscoreId = {
        subdistrictcode: "$subdistrictcode",
        subdistrictname: "$subdistrictname"
      }
      project1['subdistrictname'] = "$block_id.subdistrictname";
      project1['subdistrictcode'] = "$block_id.subdistrictcode";
      project2['subdistrictname'] = "$_id.subdistrictname";
      project2['subdistrictcode'] = "$_id.subdistrictcode";
      sort['subdistrictname'] = 1;
    }

    let cbmdsrFormsStatus = await Mdsrform1Collection.aggregate(
      // Pipeline
      // Pipeline
      [
        // Stage 1
        {
          $match: where1
        },

        // Stage 2
        {
          $lookup: {
            from: "mdsr_form_2",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "mdsrForm2"
          }
        },

        // Stage 3
        {
          $lookup: {
            from: "mdsr_form_3",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "mdsrForm3"
          }
        },

        // Stage 4
        {
          $lookup: {
            from: "mdsr_form_4",
            localField: "_id",
            foreignField: "deceased_women_id_new",
            as: "mdsrForm4"
          }
        },

        // Stage 5
        {
          $lookup: {
            from: "mdsr_form_5",
            localField: "_id",
            foreignField: "deceased_women_id_new",
            as: "mdsrForm5"
          }
        },

        // Stage 6
        {
          $lookup: {
            from: "mdsr_form_6",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "mdsrForm6"
          }
        },

        // Stage 7
        {
          $project: project1
        },

        // Stage 8
        {
          $group: {
            _id: groupUnderscoreId,
            "form1": { $sum: 1 },
            "form2": { $sum: "$mdsrForm2" },
            "form3": { $sum: "$mdsrForm3" },
            "form4": { $sum: "$mdsrForm4" },
            "form5": { $sum: "$mdsrForm5" },
            "form6": { $sum: "$mdsrForm6" },
          }
        },

        // Stage 9
        {
          $project: project2
        },

        // Stage 10
        {
          $sort: sort
        },

      ],
      // Options
      {
        cursor: {
          batchSize: 50
        }
      }
    ).toArray()

    let fbmdsrFormsStatus = await Mdsrform1Collection.aggregate(
      // Pipeline
      // Pipeline
      [
        // Stage 1
        {
          $match: where2
        },

        // Stage 2
        {
          $lookup: {
            from: "mdsr_form_2",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "mdsrForm2"
          }
        },

        // Stage 3
        {
          $lookup: {
            from: "mdsr_form_3",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "mdsrForm3"
          }
        },

        // Stage 4
        {
          $lookup: {
            from: "mdsr_form_4",
            localField: "_id",
            foreignField: "deceased_women_id_new",
            as: "mdsrForm4"
          }
        },

        // Stage 5
        {
          $lookup: {
            from: "mdsr_form_5",
            localField: "_id",
            foreignField: "deceased_women_id_new",
            as: "mdsrForm5"
          }
        },

        // Stage 6
        {
          $lookup: {
            from: "mdsr_form_6",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "mdsrForm6"
          }
        },

        // Stage 7
        {
          $project: project1
        },

        // Stage 8
        {
          $group: {
            _id: groupUnderscoreId,
            "form1": { $sum: 1 },
            "form2": { $sum: "$mdsrForm2" },
            "form3": { $sum: "$mdsrForm3" },
            "form4": { $sum: "$mdsrForm4" },
            "form5": { $sum: "$mdsrForm5" },
            "form6": { $sum: "$mdsrForm6" }
          }
        },

        // Stage 9
        {
          $project: project2
        },

        // Stage 10
        {
          $sort: sort
        },

      ],
      // Options
      {
        cursor: {
          batchSize: 50
        }
      }
    ).toArray()
    const results = { cbmdsrFormsStatus: cbmdsrFormsStatus, fbmdsrFormsStatus: fbmdsrFormsStatus }
    return results
  }

  Mdsrform1.remoteMethod("getSubmittedFormsStatus", {
    "description": "",
    description: "getSubmittedFormsStatus",
    accepts: [{
      arg: "params",
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

  Mdsrform1.getPlaceOfDeath = async function (params) {
    const self = this;;
    const { statecodes, districtcodes, subdistrictcodes, type } = params;
    const Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);

    let where = {
      updatedAt: { $gte: new Date(params.fromDate), $lte: new Date(params.toDate) },
      is_maternal_death: true
    };
    let group = createGroup("National");
    let accessupto;

    if (statecodes && statecodes.length > 0) {
      where["state_id.statecode"] = { $in: statecodes };
      group = createGroup("State");
    }
    if (districtcodes && districtcodes.length > 0) {
      where["state_id.statecode"] = { $in: statecodes };
      where["district_id.districtcode"] = { $in: districtcodes };
      group = createGroup("District");
    }
    if (subdistrictcodes && subdistrictcodes.length > 0) {
      where["state_id.statecode"] = { $in: statecodes };
      where["district_id.districtcode"] = { $in: districtcodes };
      where["block_id.subdistrictcode"] = { $in: subdistrictcodes };
      group = createGroup("Subdistrict");
    }

    const cursor = await Mdsrform1Collection.aggregate([
      { $match: where },
      { $group: group },
      {
        $project: {
          placeOfDeath: "$_id.placeOfDeath",
          statecode: "$_id.statecode",
          statename: "$_id.statename",
          districtcode: "$_id.districtcode",
          districtname: "$_id.districtname",
          subdistrictcode: "$_id.subdistrictcode",
          subdistrictname: "$_id.subdistrictname",
          count: 1,
          _id: 0
        }
      }
    ]).toArray();

    const response = await getModelData(type, params);

    const res = processCursor(cursor, response, type, accessupto, statecodes, type, districtcodes, subdistrictcodes);

    return res;
  };

  function createGroup(accessupto) {
    switch (accessupto) {
      case "State":
        return {
          _id: { "statecode": "$state_id.statecode", "statename": "$state_id.statename", "districtcode": "$district_id.districtcode", "districtname": "$district_id.districtname", "placeOfDeath": "$place_of_death" },
          count: { $sum: 1 }
        };
      case "District":
        return {
          _id: { "statecode": "$state_id.statecode", "statename": "$state_id.statename", "districtcode": "$district_id.districtcode", "districtname": "$district_id.districtname", "subdistrictcode": "$block_id.subdistrictcode", "subdistrictname": "$block_id.subdistrictname", "placeOfDeath": "$place_of_death" },
          count: { $sum: 1 }
        };
      case "Subdistrict":
        return {
          _id: { "statecode": "$state_id.statecode", "statename": "$state_id.statename", "districtcode": "$district_id.districtcode", "districtname": "$district_id.districtname", "subdistrictcode": "$block_id.subdistrictcode", "subdistrictname": "$block_id.subdistrictname", "placeOfDeath": "$place_of_death" },
          count: { $sum: 1 }
        };
      default:
        return {
          _id: { "statecode": "$state_id.statecode", "statename": "$state_id.statename", "placeOfDeath": "$place_of_death" },
          count: { $sum: 1 }
        };
    }
  }

  async function getModelData(type, params) {

    const districtModel = app.models.district;
    const subdistrictModel = app.models.subdistrict;
    switch (type) {
      case "getStates":
        return await app.models.state.find({});
      case "getDistricts":
        return await districtModel.find({ "where": { "stateCode": { inq: params.statecodes } } });
      case "getSubDistricts":
        return await subdistrictModel.find({ "where": { "districtcode": { inq: params.districtcodes } } });
      default:
        return await app.models.state.find({});
    }
  }
  function processCursor(cursor, response, type, accessupto, statecodes, districtcodes, subdistrictcodes) {
    const res = [];
    let key, nameKey, codeKey; // Initialize key, nameKey, and codeKey
    // Determine key, nameKey, and codeKey based on accessupto and type
    if (type === 'getStates') {
      key = 'statecode';
      nameKey = 'statename';
      codeKey = 'statecode';
    } else if (type === 'getDistricts') {
      key = 'districtcode';
      nameKey = 'districtname';
      codeKey = 'districtcode';
    } else if (type === 'getSubDistricts') {
      key = 'subdistrictcode';
      nameKey = 'subdistrictname';
      codeKey = 'subdistrictcode';
    }

    // Create a map to store counts for each code
    const countMap = {};
    // Initialize countMap with keys
    cursor.forEach(item => {
      countMap[item[key]] = {
        [codeKey]: item[codeKey],
        [nameKey]: item[nameKey],
        home: 0,
        transit: 0,
        other: 0,
        facility: 0,
        total: 0
      };
    });

    // Accumulate counts using forEach
    cursor.forEach(item => {
      countMap[item[key]].home += item.placeOfDeath === 'Home' ? item.count : 0;
      countMap[item[key]].transit += item.placeOfDeath === 'Transit' ? item.count : 0;
      countMap[item[key]].other += item.placeOfDeath === 'Other' ? item.count : 0;
      countMap[item[key]].facility += item.placeOfDeath === 'Health Facility' ? item.count : 0;
      countMap[item[key]].total += item.count;
    });

    // Update names using forEach
    response.forEach(item => {
      if (countMap[item[key]]) {
        countMap[item[key]][nameKey] = item[nameKey];
        // Include additional keys for 'getDistricts' and 'getSubDistricts'
        if (type === 'getDistricts' && item.stateCode && item.stateName) {
          countMap[item[key]].statecode = item.stateCode;
          countMap[item[key]].statename = item.stateName;
        } else if (type === 'getSubDistricts' && item.statecode && item.statename) {
          countMap[item[key]].statecode = item.statecode;
          countMap[item[key]].statename = item.statename;
          countMap[item[key]].districtcode = item.districtcode;
          countMap[item[key]].districtname = item.districtname;
        }
      }
    });

    // Convert countMap to an array of objects using Object.values
    const finalRes = Object.values(countMap);

    // Sort the result based on total count using sort
    finalRes.sort((a, b) => b.total - a.total);

    return finalRes;
  }

  Mdsrform1.remoteMethod('getPlaceOfDeath', {
    description: 'Getting the count of the place of death (Facility, Transit, Home & Other)',
    accepts: [{
      arg: 'params',
      type: 'object',
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  })

  Mdsrform1.getPlaceOfDeathValues = async function (id, field) {
    const self = this;
    const { designation } = await Mdsrform1.app.models.usermaster.findOne({ where: { id } });
    const facilityDesignations = ['Facility', 'FNO']
    if (field == "placeOfDeath") {
      let placeOfDeath = [{ "label": "Health Facility", "value": "Health Facility" }, { "label": "Transit", "value": "Transit" }];
      if (designation && !facilityDesignations.includes(designation)) {
        return [{ "label": "Home", "value": "Home" }, { "label": "Transit", "value": "Transit" }, { "label": "Health Facility", "value": "Health Facility" }, { "label": "Others/private", "value": "Other" }];
      } else {
        return [{ "label": "Health Facility", "value": "Health Facility" }, { "label": "Transit", "value": "Transit" }];
      }
    } else if (field.trim() == "designation".trim()) {
      if (designation && !facilityDesignations.includes(designation)) {
        return [{ "label": "ASHA", "value": "ASHA" }, { "label": "ANM", "value": "ANM" }, { "label": "Individual", "value": "Individual" }];
      } else {
        return [{ "label": "Doctor", "value": "Doctor" }];
      }
    } else if (field.trim() === 'verifiedBy') {
      if (designation && !facilityDesignations.includes(designation)) {
        return [{ "label": "ANM", "value": "ANM" }, { "label": "MO", "value": "MO" }];
      } else {
        return [{ "label": "MO", "value": "MO" }];
      }
    }
  }

  Mdsrform1.remoteMethod('getPlaceOfDeathValues', {
    description: 'Getting the count of the place of death (Facility, Transit, Home & Other)',
    accepts: [{
      arg: 'id',
      type: 'string',
    }, {
      arg: 'field',
      type: 'string',
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  })



  Mdsrform1.maternalDeathTypesGraphData = async function (params) {
    let where = {
      is_maternal_death: true,
      updatedAt: {
        $gte: new Date(params.fromDate),
        $lte: new Date(params.toDate)
      }
    }

    const data = await Mdsrform1.aggregate({
      aggregate: [
        {
          $match: where
        },
        {
          $group: {
            _id: { "place_of_death": "$place_of_death" },
            count: { $sum: 1 }
          }
        }, {
          $project: {
            category: "$_id.place_of_death",
            'column-1': "$count",
            _id: 0
          }
        }]
    });
    return data;

  }

  Mdsrform1.remoteMethod('maternalDeathTypesGraphData', {
    description: 'Get Maternal Death Byfurcation Home Transit, other and Facility',
    accepts: [{
      arg: 'params',
      type: 'object',
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  })

  Mdsrform1.getReportOfMaternalCauseOfdeaths = async function (params) {
    let self = this;
    let Mdsrform4Collection = self.getDataSource().connector.collection(Mdsrform1.app.models.MdsrForm4.modelName);
    let Mdsrform5Collection = self.getDataSource().connector.collection(Mdsrform1.app.models.MdsrForm5.modelName);
    const { fromDate, toDate, accessUpto, districtcodes, statecodes, subdistrictcodes, causes } = params;
    const where = {
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
    }

    const where1 = { ...where }

    if (accessUpto == "Block") {
      block_id = params.where.block_id;
    } else if (accessUpto === "National") {
      if (typeof (statecodes) !== 'undefined' && statecodes.length > 0 && districtcodes.length === 0 & subdistrictcodes.length === 0) {
        where["general_information.state.statecode"] = { $in: statecodes || [] };
        where1["generalinformation.state_id.statecode"] = { $in: statecodes || [] };

        var groupId = "$statecode"
      } else if (typeof (districtcodes) !== 'undefined' && districtcodes.length && statecodes.length > 0 && subdistrictcodes.length === 0) {
        where["general_information.state.statecode"] = { $in: statecodes || [] };
        where1["generalinformation.state_id.statecode"] = { $in: statecodes || [] };
        where["general_information.district.districtcode"] = { $in: districtcodes || [] };
        where1["generalinformation.district_id.districtcode"] = { $in: districtcodes || [] };

        var groupId = "$districtcode"
      } else if (typeof (subdistrictcodes) !== 'undefined' && subdistrictcodes.length > 0 && statecodes.length > 0 && districtcodes.length > 0) {
        where["general_information.state.statecode"] = { $in: statecodes || [] };
        where1["generalinformation.state_id.statecode"] = { $in: statecodes || [] };
        where["general_information.district.districtcode"] = { $in: districtcodes || [] };
        where1["generalinformation.district_id.districtcode"] = { $in: districtcodes || [] };
        where["general_information.block.subdistrictcode"] = { $in: subdistrictcodes || [] };
        where1["generalinformation.block_id.subdistrictcode"] = { $in: subdistrictcodes || [] };

        var groupId = "$subdistrictcode"
      } else {
        var groupId = "$statecode"
      }
    } else if (accessUpto === "District") {
      where["general_information.district.districtcode"] = { $in: districtcodes };
      where1["generalinformation.district_id.districtcode"] = { $in: districtcodes };
      var groupId = "$subdistrictcode"

      if (subdistrictcodes && subdistrictcodes.length) {
        where["general_information.block.subdistrictcode"] = { $in: subdistrictcodes };
        where1["generalinformation.block_id.subdistrictcode"] = { $in: subdistrictcodes };
      }
    } else if (accessUpto === "State" || "District") {
      where["general_information.state.statecode"] = { $in: statecodes };
      where1["generalinformation.state_id.statecode"] = { $in: statecodes };
      var groupId = "$districtcode"
      if (districtcodes && districtcodes.length) {
        where["general_information.district.districtcode"] = { $in: districtcodes };
        where1["generalinformation.district_id.districtcode"] = { $in: districtcodes };
        var groupId = "$subdistrictcode"
      }
    } else {

    }

    const group = {
      districtcode: { "$first": "$districtcode" },
      statecode: { "$first": "$statecode" },
      statename: { "$first": "$statename" },
      districtname: { "$first": "$districtname" },
      subdistrictcode: { "$first": "$subdistrictcode" },
      subdistrictname: { "$first": "$subdistrictname" },
      abortion: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Abortion"] }, 1, 0
          ]
        }
      },
      amnioticFluidEmbolism: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Amniotic Fluid Embolism"] }, 1, 0
          ]
        }
      },
      hepatorenalFailure: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Hepatorenal failure due to vomiting during pregnancy"] }, 1, 0
          ]
        }
      },
      Hypertension: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Essential Hypertension"] }, 1, 0
          ]
        }
      },
      sepsis: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Puerperal sepsis"] }, 1, 0
          ]
        }
      },
      haemorrhage: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Postpartum haemorrhage"] }, 1, 0
          ]
        }
      },
      obstructedLabour: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Chorioamnionitis without or with obstructed labour / prolonged labour"] }, 1, 0
          ]
        }
      },
      ectopicPregnancy: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Ectopic Pregnancy"] }, 1, 0
          ]
        }
      },
      gestationalTrophoblasticDisease: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Gestational Trophoblastic Disease"] }, 1, 0
          ]
        }
      },
      hypertensiveDisorders: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Hypertensive disorders of pregnancy induced hypertension"] }, 1, 0
          ]
        }
      },
      Preclampsia: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Pre eclampsia"] }, 1, 0
          ]
        }
      },
      Eclampsia: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Eclampsia"] }, 1, 0
          ]
        }
      },
      HELLPSyndrome: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "HELLP Syndrome"] }, 1, 0
          ]
        }
      },
      AntepartumHemorrhage: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Antepartum Hemorrhage"] }, 1, 0
          ]
        }
      },
      Scardehiscence: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Scar dehiscence"] }, 1, 0
          ]
        }
      },
      otherwise: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Rupture uterus after obstructed labour or otherwise"] }, 1, 0
          ]
        }
      },
      caesareanSection: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Surgical injury during labour, Caesarean Section / Forceps or Vacuum delivery Cervical / Vaginal tears, others"] }, 1, 0
          ]
        }
      },
      PostSurgicalProcedure: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Post surgical procedures (E.g. evacuaton, Cesarean section, laparotomy, manual removal of placenta, others) Infections of genito urinary tract Infection of obstetric surgical wound following delivery Infections of breast associated with child birth Pyrexia of unknown origin following delivery"] }, 1, 0
          ]
        }
      },
      thirdStageHaemorrhage: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Third Stage haemorrhage with/without Retained placenta, with/without Inversion of uterus"] }, 1, 0
          ]
        }
      },
      unexplained: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Unexplained"] }, 1, 0
          ]
        }
      },
      Unknown: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Unknown"] }, 1, 0
          ]
        }
      },
      uterineInversion: {
        $sum: {
          $cond: [
            { $eq: ["$icd_category", "Uterine Inversion"] }, 1, 0
          ]
        }
      },
      liverDisorders: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_category", "Liver Disorders"] }, 1, 0
          ]
        }
      },
      Anaemia: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_category", "Anaemia"] }, 1, 0
          ]
        }
      },
      cardiacDisorders: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_category", "Cardiac disorders"] }, 1, 0
          ]
        }
      },
      infections: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_category", "Infections/ Infestations"] }, 1, 0
          ]
        }
      },
      neurologicalDisorders: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_category", "Neurological Disorders"] }, 1, 0
          ]
        }
      },
      Renaldisorders: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_category", "Renal disorders"] }, 1, 0
          ]
        }
      },
      respiratoryDisorders: {
        $sum: {
          $cond: [
            { $eq: ["$icd_indirect_category", "Respiratory Disorders"] }, 1, 0
          ]
        }
      },
    };

    let newGroup = {
      _id: groupId,
      districtcode: { "$first": "$districtcode" },
      statecode: { "$first": "$statecode" },
      statename: { "$first": "$statename" },
      districtname: { "$first": "$districtname" },
      subdistrictcode: { "$first": "$subdistrictcode" },
      subdistrictname: { "$first": "$subdistrictname" },
    }

    for (const [key, value] of Object.entries(group)) {
      const found = causes?.includes(key);
      if (found === true) {
        if (Object.keys(newGroup).length) {
          Object.assign(newGroup, { [key]: value });
        }
      }
    }
    let _group
    if (typeof (causes) === undefined) {
      _group = newGroup
    } else {
      _group = { ...group, _id: groupId }

    }
    const form4data = await Mdsrform4Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: where
        },

        // Stage 2
        {
          $project: {
            statecode: "$general_information.state.statecode",
            statename: "$general_information.state.statename",
            districtname: "$general_information.district.districtname",
            districtcode: "$general_information.district.districtcode",
            subdistrictname: "$general_information.block.subdistrictname",
            subdistrictcode: "$general_information.block.subdistrictcode",
            //month: 1,
            //year: 1,
            icd_category: "$cause_of_death.direct.category",
            icd_indirect_category: "$cause_of_death.indirect.category",
            icd_indirect_sub_category: '$cause_of_death.indirect.sub_category'
          }
        },

        // Stage 3
        {
          $group: _group
        }
      ],

      // Options
      {
        cursor: {
          batchSize: 50
        },

        allowDiskUse: true
      }

      // Created with 3T MongoChef, the GUI for MongoDB - https://3t.io/mongochef

    ).toArray();

    const form5data = await Mdsrform5Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: where1
        },

        // Stage 2
        {
          $project: {
            statecode: "$generalinformation.state_id.statecode",
            statename: "$generalinformation.state_id.statename",
            districtname: "$generalinformation.district_id.districtname",
            districtcode: "$generalinformation.district_id.districtcode",
            subdistrictname: "$generalinformation.block_id.subdistrictname",
            subdistrictcode: "$generalinformation.block_id.subdistrictcode",
            month: { "$month": "$createdAt" },
            year: { "$year": "$createdAt" },
            icd_category: "$other.cause_of_death.direct.category",
            icd_indirect_category: "$other.cause_of_death.indirect.category",
            icd_indirect_sub_category: "$other.cause_of_death.indirect.sub_category"
          }
        },

        // Stage 3
        {
          $group: _group
        }
      ],

      // Options
      {
        cursor: {
          batchSize: 50
        },

        allowDiskUse: true
      }

      // Created with 3T MongoChef, the GUI for MongoDB - https://3t.io/mongochef

    ).toArray()

    const resultData = form5data.concat(form4data);

    function sumSameKeys(arr, excludeList) {
      let result = [];
      let map = {};

      arr.forEach(function (obj) {
        let id = obj._id;
        if (!map[id]) {
          map[id] = { _id: id };
          result.push(map[id]);
        }
        for (let key in obj) {
          if (key === "_id") continue;
          if (excludeList.includes(key)) {
            if (!map[id][key]) {
              map[id][key] = obj[key];
            }
            continue;
          }
          if (!map[id].hasOwnProperty(key)) {
            if (isNaN(obj[key])) {
              map[id][key] = obj[key];
            } else {
              map[id][key] = 0;
            }
          } else if (isNaN(obj[key])) {
            map[id][key] = obj[key];
          } else {
            map[id][key] += obj[key];
          }
        }
      });

      return result;
    }
    const excludeList = ["districtcode", "statecode", "subdistrictcode"];
    let _arr = sumSameKeys(resultData, excludeList);
    const arr = _arr.filter(c => c._id != null)
    var output = [{}];


    for (let i in arr) {
      for (let key in arr[i]) {
        if (output[0].hasOwnProperty(key)) {
          output[0][key] += arr[i][key];
        } else {
          output[0][key] = arr[i][key];
        }
      }

    }
    var obj = Object.assign({}, ...output);
    const total = { ...obj, statename: "Total", districtname: "Total", subdistrictname: "Total" }
    arr.push(total);
    arr.sort((a, b) => a._id - b._id);

    return arr;

  }

  Mdsrform1.remoteMethod("getReportOfMaternalCauseOfdeaths", {
    "description": "",
    description: "getReportOfMaternalCauseOfdeaths",
    accepts: [{
      arg: "params",
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

  Mdsrform1.getMaternalDeathNotificationDetails = async function (params) {
    var self = this;
    var Mdsrform1Collection = self.getDataSource().connector.collection(Mdsrform1.modelName);
    let Mdsrform4Collection = app.models.mdsr_form_4;
    let Mdsrform5Collection = app.models.mdsr_form_5;

    const { fromDate, toDate, accessUpto, districtcodes, statecodes, subdistrictcodes, type } = params;
    const where = {
      createdAt: { between: [new Date(fromDate), new Date(toDate)] }
    }
    const where1 = {
      createdAt: { between: [new Date(fromDate), new Date(toDate)] }
    }
    if (accessUpto == "Block") {
      where["general_information.block.subdistritcode"] = subdistrictcodes;
      where1["generalinformation.block_id.subdistrictcode"] = subdistrictcodes;
    } else if (accessUpto === "National") {

    } else if (accessUpto === "District") {
      where["general_information.district.districtcode"] = { $in: districtcodes };
      where1["generalinformation.district_id.districtcode"] = { $in: districtcodes };

      if (subdistrictcodes && subdistrictcodes.length) {
        where["general_information.block.subdistrictcode"] = { $in: subdistrictcodes };
        where1["generalinformation.block_id.subdistrictcode"] = { $in: districtcodes };
      }
    } else if (accessUpto === "State" || "District") {
      where["general_information.state.statecode"] = 9;
      where1["generalinformation.state_id.statecode"] = 9;
      if (districtcodes && districtcodes.length) {
        where["general_information.district.districtcode"] = { $in: districtcodes };
        where1["generalinformation.district_id.districtcode"] = { $in: districtcodes };
      }
    } else {

    }
    params['is_maternal_death'] = true;
    if (type === "abortion") {
      where["cause_of_death.direct.category"] = "Abortion"
      where1["other.cause_of_death.direct.category"] = "Abortion"

    } else if (type === "Hypertension") {
      where["cause_of_death.direct.category"] = "Essential Hypertension"
      where1["other.cause_of_death.direct.category"] = "Essential Hypertension"

    } else if (type === "sepsis") {
      where["cause_of_death.direct.category"] = "Puerperal sepsis"
      where1["other.cause_of_death.direct.category"] = "Puerperal sepsis"

    } else if (type === "Haemorrhage") {
      where["cause_of_death.direct.category"] = "Postpartum haemorrhage"
      where1["other.cause_of_death.direct.category"] = "Postpartum haemorrhage"

    } else if (type === "obstructedLabour") {
      where["cause_of_death.direct.category"] = "Chorioamnionitis without or with obstructed labour / prolonged labour"
      where1["other.cause_of_death.direct.category"] = "Chorioamnionitis without or with obstructed labour / prolonged labour"

    } else if (type === "IndirectCause") {
      var data = {
        or: [
          { "cause_of_death.indirect.category": "Anaemia" },
          { "cause_of_death.indirect.category": "Cardiac disorders" },
          { "cause_of_death.indirect.category": "Endocrinal Disorders" },
          { "cause_of_death.indirect.category": "Infections/ Infestations" },
          { "cause_of_death.indirect.category": "Liver Disorders" },
          { "cause_of_death.indirect.category": "Neurological Disorders" },
          { "cause_of_death.indirect.category": "Renal disorders" },
          { "cause_of_death.indirect.category": "Respiratory Disorders" },
        ]
      }
      var secondData = {
        or: [
          { "other.cause_of_death.indirect.category": "Anaemia" },
          { "other.cause_of_death.indirect.category": "Cardiac disorders" },
          { "other.cause_of_death.indirect.category": "Endocrinal Disorders" },
          { "other.cause_of_death.indirect.category": "Infections/ Infestations" },
          { "other.cause_of_death.indirect.category": "Liver Disorders" },
          { "other.cause_of_death.indirect.category": "Neurological Disorders" },
          { "other.cause_of_death.indirect.category": "Renal disorders" },
          { "other.cause_of_death.indirect.category": "Respiratory Disorders" },
        ]
      }
    } else if (type === "OtherDirectCause") {

      let cursor = await Mdsrform4Collection.find({
        where: where, "or": [
          { "cause_of_death.direct.category": "Abortion" },
          { "cause_of_death.direct.category": "Essential Hypertension" },
          { "cause_of_death.direct.category": "Puerperal sepsis" },
          { "cause_of_death.direct.category": "Postpartum haemorrhage" },
          { "cause_of_death.direct.category": "Chorioamnionitis without or with obstructed labour / prolonged labour" }
        ]
      })
      let result = await Mdsrform5Collection.find({
        where: where1, "or": [
          { "other.cause_of_death.direct.category": "Abortion" },
          { "other.cause_of_death.direct.category": "Essential Hypertension" },
          { "other.cause_of_death.direct.category": "Puerperal sepsis" },
          { "other.cause_of_death.direct.category": "Postpartum haemorrhage" },
          { "other.cause_of_death.direct.category": "Chorioamnionitis without or with obstructed labour / prolonged labour" }
        ]
      })

      const finalResult = cursor.concat(result)

      if (cursor) {
        return finalResult;
      }
    } else if (type === "Dengue") {

      where["cause_of_death.indirect.sub_category"] = "Dengue"
      where1["other.cause_of_death.indirect.sub_category"] = "Dengue"

    } else if (type === "RespiratoryDisorders") {

      where["cause_of_death.indirect.sub_category"] = "Respiratory Disorders"
      where1["other.cause_of_death.indirect.sub_category"] = "Respiratory Disorders"

    } else if (type === "HIV_AIDS") {

      where["cause_of_death.indirect.sub_category"] = "HIV / AIDS"
      where1["other.cause_of_death.indirect.sub_category"] = "HIV / AIDS"

    } else if (type === "H1N1ViralDisease") {
      where["cause_of_death.indirect.sub_category"] = "H1N1 viral Disease"
      where1["other.cause_of_death.indirect.sub_category"] = "H1N1 viral Disease"

    } else if (type === "Malaria") {

      where["cause_of_death.indirect.sub_category"] = "Malaria"
      where1["other.cause_of_death.indirect.sub_category"] = "Malaria"

    } else if (type === "Enhephalitis") {

      where["cause_of_death.indirect.sub_category"] = "Enhephalitis"
      where1["other.cause_of_death.indirect.sub_category"] = "Enhephalitis"

    } else if (type === "OtherInDirectCauses") {
      var data = {
        or: [
          { "cause_of_death.indirect.sub_category": "Dengue" },
          { "cause_of_death.indirect.sub_category": "HIV / AIDS" },
          { "cause_of_death.indirect.sub_category": "H1N1 viral Disease" },
          { "cause_of_death.indirect.sub_category": "Malaria" },
          { "cause_of_death.indirect.sub_category": "Enhephalitis" },
          { "cause_of_death.indirect.sub_category": "Adult respiratory distress syndrome" },
          { "cause_of_death.indirect.sub_category": "Tuberculosis" },
          { "cause_of_death.indirect.sub_category": "Pneumonia" },
          { "cause_of_death.indirect.sub_category": "Pulmonary embolism" }
        ]
      }
      var secondData = {
        or: [
          { "other.cause_of_death.indirect.sub_category": "Dengue" },
          { "other.cause_of_death.indirect.sub_category": "HIV / AIDS" },
          { "other.cause_of_death.indirect.sub_category": "H1N1 viral Disease" },
          { "other.cause_of_death.indirect.sub_category": "Malaria" },
          { "other.cause_of_death.indirect.sub_category": "Enhephalitis" },
          { "other.cause_of_death.indirect.sub_category": "Adult respiratory distress syndrome" },
          { "other.cause_of_death.indirect.sub_category": "Tuberculosis" },
          { "other.cause_of_death.indirect.sub_category": "Pneumonia" },
          { "other.cause_of_death.indirect.sub_category": "Pulmonary embolism" }
        ]
      }
    }



    let cursor = await Mdsrform4Collection.find({ where: where, data })
    let result = await Mdsrform5Collection.find({ where: where1, secondData })

    const finalResult = cursor.concat(result)

    if (cursor) {
      return finalResult;
    }
    ;
  }
  Mdsrform1.remoteMethod("getMaternalDeathNotificationDetails", {
    description: "Get Report Maternal Death Notification Details",
    accepts: [{
      arg: "params",
      type: "object"
    }],
    returns: {
      root: true,
      type: "array"
    },
    http: {
      verb: "get"
    }
  });

  Mdsrform1.maternalDeathNotificationData = async function (params) {
    const { fromDate, toDate, accessUpto, districtcodes, statecodes, type, subdistrictcodes, userId } = params;
    let Mdsrform4Collection = app.models.mdsr_form_4;
    let Mdsrform5Collection = app.models.mdsr_form_5;
    let Mdsrform6Collection = app.models.mdsr_form_6;
    const matchObj = {
      // createdAt: { between: [new Date(fromDate), new Date(toDate)] }
    }
    if (accessUpto === 'State') {

      matchObj["state_id.statecode"] = statecodes

    } else if (accessUpto === 'District') {
      matchObj["district_id.districtcode"] = districtcodes

    } else if (accessUpto === 'Block') {
      matchObj["created_by"] = ObjectId(userId);
    }
    const data = await Mdsrform1.find({ where: matchObj });
    const uid = []
    for (const item of data) {
      uid.push(item.id)
    }
    const form4 = await Mdsrform4Collection.find({ where: { deceased_women_id_new: { inq: uid } } });
    const form5 = await Mdsrform5Collection.find({ where: { deceased_women_id_new: { inq: uid } } });
    const form6 = await Mdsrform6Collection.find({ where: { deceased_women_id_new: { inq: uid } } });
    const delayedform4 = [];
    for (const item of data) {
      const found = form4?.find(found => found.deceased_women_id_new.toString() === item.id.toString());
      const form5id = form5?.find(form5id => form5id.deceased_women_id_new.toString() === item.id.toString());
      const form6id = form6?.find(form6id => form6id.deceased_women_id_new.toString() === item.id.toString());
      if (found || form5id || form6id) {
        const hours = Math.round((found?.createdAt.getTime() - item?.createdAt.getTime()) / 259200000);
        if (hours > 2) {
          delayedform4.push({ ...item, delayedBy: hours, formdate: found.createdAt, form4_id: found?.id, form5_id: form5id?.id, form6_id: form6id?.id })
        }
      } else {
        var today = new Date().getTime();
        const time = Math.round((today - item.createdAt.getTime()) / 259200000)
        if (time > 2) {
          delayedform4.push({ ...item, delayedBy: time, formdate: new Date(), form4_id: "", form5_id: "", form6_id: "" })
        }
      }
    }
    const delayedform5 = [];
    for (const item of data) {
      const found = form5?.find(found => found.deceased_women_id_new.toString() === item.id.toString());
      const form4id = form5?.find(form4id => form4id.deceased_women_id_new.toString() === item.id.toString());
      const form6id = form6?.find(form6id => form6id.deceased_women_id_new.toString() === item.id.toString());
      if (found || form4id || form6id) {
        const hours = Math.round((found.createdAt.getTime() - item.createdAt.getTime()) / 259200000);
        if (hours > 2) {
          delayedform5.push({ ...item, delayedBy: hours, formdate: found.createdAt, form5_id: found?.id, form4_id: form4id?.id, form6_id: form6id?.id })
        }
      } else {
        var today = new Date().getTime();
        const time = Math.round((today - item.createdAt.getTime()) / 259200000)
        if (time > 2) {
          delayedform5.push({ ...item, delayedBy: time, formdate: new Date(), form4_id: "", form5_id: "", form6_id: "" })
        }
      }
    }

    if (type === "count") {
      const obj = {
        "total": delayedform4.length + delayedform5.length,
        "delayform4": delayedform4.length,
        "delayform5": delayedform5.length
      }
      return obj;
    } else if (type === "delayedform4") {
      return delayedform4
    } else if (type === "delayedform5") {
      return delayedform5
    }
  }

  Mdsrform1.remoteMethod('maternalDeathNotificationData', {
    description: 'Get Maternal Death Notifiaction Data ',
    accepts: [{
      arg: 'params',
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

  // api for SUMAN portal data
  Mdsrform1.sumanData = async function (params) {
    try {
      const secretKey = "97258185-7987-4c0d-91de-a93b01274ca5"
      if (!params.token) {
        const err = new Error('Unauthorized');
        err.statusCode = 401;
        err.code = "Unauthorized Request";
        return err;
      } else {
        // verify the token using the secret key
        const decoded = jwt.verify(params.token, secretKey);
        if (decoded.authorized) {
          const mdsrForm1Connection = this.getDataSource().connector.collection(Mdsrform1.modelName);

          let { state_code, district_code, block_code, fromDate, toDate } = params;
          let matchobj = {};
          if (state_code) {
            matchobj['state_id.statecode'] = state_code;
          }
          if (district_code) {
            matchobj['district_id.districtcode'] = district_code
          }
          if (block_code) {
            matchobj['block_id.subdistrictcode'] = block_code
          }
          if (fromDate && toDate) {
            matchobj['death_date_time'] = { gte: fromDate, lte: toDate }
          }
          return await mdsrForm1Connection.aggregate(
            [
              {
                "$match": matchobj
              },
              {
                "$project": {
                  "_id": 0.0,
                  "name_of_mother": {
                    "$concat": [
                      "$deceased_women_fname",
                      " ",
                      "$deceased_women_mname",
                      " ",
                      "$deceased_women_lname"
                    ]
                  },
                  "age_of_mother": "$age",
                  "husband_name": "$husband_name",
                  "state_code": "$state_id.statecode",
                  "district_code": "$district_id.districtcode",
                  "block": "$block_id.subdistrictname",
                  "village": "$village_name",
                  "date_of_death": {
                    "$dateToString": {
                      "format": "%Y-%m-%d",
                      "date": "$death_date_time"
                    }
                  },
                  "time_of_death": {
                    "$dateToString": {
                      "format": "%H:%M:%S",
                      "date": "$death_date_time"
                    }
                  },
                  "name_of_responder": "$reporting_person",
                  "contact_no": "$reporting_person_mobile",
                  "address_of_responder": "$reporting_person_address"
                }
              },
              {
                "$sort": {
                  "state_code": 1.0,
                  "district_code": 1.0,
                  "block": 1.0
                }
              }
            ]
          ).toArray();
        }
      }
    } catch (e) {
      if (e.name === 'JsonWebTokenError') {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        err.code = "Invalid token";
        return err;
      }
    }
  };
  Mdsrform1.remoteMethod('sumanData', {
    description: 'get Data for Suman Portal',
    accepts: [
      {
        arg: 'params',
        type: 'object',
        http: {
          source: 'body'
        }
      }
    ],
    returns: {
      root: true,
      type: 'array'
    },
    http: {
      verb: 'post'
    }
  });

  Mdsrform1.userLoginCountsInSpecificDuration = async function (params) {
 try{
    var userMasterCollection = this.getDataSource().connector.collection(app.models.Usermaster.modelName);
    const stateModel = app.models.state;
    const districtModel = app.models.district;
    const subdistrictModel = app.models.subdistrict;

    const { accessUpto, statecode, districtcode, subdistrictcode } = params;
    let masterAPiArg = {}, masterAPiGroup = {}, match = {}, match1 = {};

    match['designation'] = { $in: ['BMO', 'FNO'] };

    if (accessUpto === 'National') {
      match['usertype'] = 'MDSR';
      masterAPiArg['type'] = 'getState';
      masterAPiGroup = {statecode: "$statecode"}
      if (statecode && statecode.length >= 1) {
        match["user_state_id.statecode"]= { $in: statecode };
      }
      if (districtcode && districtcode.length >= 1) {
        masterAPiArg['type'] = "getDistrict";
        match["user_district_id.districtcode"]= { $in: districtcode } ;
        masterAPiGroup = { districtcode: "$districtcode" };
      }
      if (subdistrictcode && subdistrictcode.length >= 1) {
        masterAPiArg['type'] = 'getSubDistricts';
        match["user_block_id.subdistrictcode"]= { $in: subdistrictcode };
        masterAPiGroup = { subdistrictcode: "$subdistrictcode" };
      }
    }else if (accessUpto === 'State') {
      match["user_state_id.statecode"]= { $in: statecode }
      masterAPiArg['type'] = 'getDistrict';
      masterAPiGroup = {districtcode: "$districtcode" } 
      if (districtcode && districtcode.length >= 1) {
        masterAPiArg['type'] = "getSubDistricts";
        match["user_district_id.districtcode"]= { $in: districtcode } ;
        masterAPiGroup = { subdistrictcode: "$subdistrictcode" };   
      }if (subdistrictcode && subdistrictcode.length >= 1) {
        masterAPiArg['type'] = 'getSubDistricts';
        match["user_block_id.subdistrictcode"]={ $in: subdistrictcode };
        masterAPiGroup = { subdistrictcode: "$subdistrictcode" };
      }

    }
    else if (accessUpto === 'District') {
      masterAPiArg['type'] = 'getSubDistricts';
      match = { "user_district_id.districtcode": districtcode  };
      masterAPiGroup = { subdistrictname: "$subdistrictname", subdistrictcode: "$subdistrictcode" };
      if (subdistrictcode && subdistrictcode.length >= 1) {
        match["user_block_id.subdistrictcode"] =  subdistrictcode;
      }
    }
    const response = await userMasterCollection.aggregate([
      {
        $match: match,
      },
      {
        $project: {
          statecode: "$user_state_id.statecode",
          statename: "$user_state_id.statename",
          districtname: "$user_district_id.districtname",
          districtcode: "$user_district_id.districtcode",
          subdistrictcode: "$user_block_id.subdistrictcode",
          subdistrictname: "$user_block_id.subdistrictname",
          facilityLogin: {
            $cond: [
              { $and: [{ $eq: ["$designation", "FNO"] }, { $eq: ["$useridactive", true] }] },
              1,
              0,
            ],
          },
          blockLogin: {
            $cond: [
              { $and: [{ $eq: ["$designation", "BMO"] }, { $eq: ["$useridactive", true] }] },
              1,
              0,
            ],
          },
          facility_active: {
            $cond: [
              {
                $and: [
                  { $eq: ["$designation", "FNO"] },
                  { $eq: ["$logged_once", true] },
                  { $eq: ["$useridactive", true] },
                ],
              },
              1,
              0,
            ],
          },
          block_active: {
            $cond: [
              {
                $and: [
                  { $eq: ["$designation", "BMO"] },
                  { $eq: ["$logged_once", true] },
                  { $eq: ["$useridactive", true] },
                ],
              },
              1,
              0,
            ],
          },
          facility_30days: {
            $cond: [
              {
                $and: [
                  { $eq: ["$designation", "FNO"] },
                  { $eq: ["$last_thirty_days_login", true] },
                  { $eq: ["$useridactive", true] },
                ],
              },
              1,
              0,
            ],
          },
          block_30days: {
            $cond: [
              {
                $and: [
                  { $eq: ["$designation", "BMO"] },
                  { $eq: ["$last_thirty_days_login", true] },
                  { $eq: ["$useridactive", true] },
                ],
              },
              1,
              0,
            ],
          },
          facility_60days: {
            $cond: [
              {
                $and: [
                  { $eq: ["$designation", "FNO"] },
                  { $eq: ["$last_sixty_days_login", true] },
                  { $eq: ["$useridactive", true] },
                ],
              },
              1,
              0,
            ],
          },
          block_60days: {
            $cond: [
              {
                $and: [
                  { $eq: ["$designation", "BMO"] },
                  { $eq: ["$last_sixty_days_login", true] },
                  { $eq: ["$useridactive", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: masterAPiGroup,
          total: { $sum: "$count" },
          facilityLogin: { $sum: "$facilityLogin" },
          blockLogin: { $sum: "$blockLogin" },
          facility_active: { $sum: "$facility_active" },
          block_active: { $sum: "$block_active" },
          facility_30days: { $sum: "$facility_30days" },
          block_30days: { $sum: "$block_30days" },
          facility_60days: { $sum: "$facility_60days" },
          block_60days: { $sum: "$block_60days" },
        },
      },
    ]).toArray();
  
    const data = [];
    for (const item of response) {
      let record = {
        facilityLogin: item.facilityLogin,
        blockLogin: item.blockLogin,
        facility_active: item.facility_active,
        block_active: item.block_active,
        facility_30days: item.facility_30days,
        block_30days: item.block_30days,
        facility_60days: item.facility_60days,
        block_60days: item.block_60days,
      };
      if (masterAPiArg.type === 'getState') {
        const stateInfo = await stateModel.findOne({
          where: { statecode: item?._id?.statecode, statename: item?._id?.statename },
        });
        if (stateInfo) {
          data.push({ ...record, statename: stateInfo.statename, statecode: stateInfo.statecode });
        }
      } else if (masterAPiArg.type === 'getDistrict') {
        const districtInfo = await districtModel.findOne({
          where: { districtcode: item?._id?.districtcode, districtname: item?._id?.districtname },
        });
        if (districtInfo) {
          data.push({
            ...record,
            districtname: districtInfo?.districtname,
            districtcode: districtInfo?.districtcode,
            statename: districtInfo?.stateName,
            statecode: districtInfo?.stateCode,
          });
        }
      } else if (masterAPiArg.type === 'getSubDistricts') {
        const subdistrictInfo = await subdistrictModel.findOne({
          where: {
            subdistrictcode: item?._id?.subdistrictcode,
            subdistrictname: item?._id?.subdistrictname,
          },
        });
        if (subdistrictInfo) {
          data.push({
            ...record,
            subdistrictname: subdistrictInfo?.subdistrictname,
            subdistrictcode: subdistrictInfo?.subdistrictcode,
            statename: subdistrictInfo?.statename,
            statecode: subdistrictInfo?.statecode,
            districtname: subdistrictInfo?.districtname,
            districtcode: subdistrictInfo?.districtcode,
          });
        }
      }
    }
    return data;
  } catch (error) {
    throw error;
  }
    
  }

  Mdsrform1.remoteMethod('userLoginCountsInSpecificDuration', {
    description: 'get users login count for last 30 and 60 days',
    accepts: [
      {
        arg: "params",
        type: "object",
      },
    ],
    returns: {
      root: true,
      type: "array",
    },
    http: {
      verb: "get",
    },
  })

  Mdsrform1.countCbmdsrOutofFbmdsr = async function (params) {
    const Mdsrform1Collection = this.getDataSource().connector.collection(Mdsrform1.modelName);
    const stateModel = app.models.state;
    const districtModel = app.models.district;
    const subdistrictModel = app.models.subdistrict;
    const { statecodes, fromDate, toDate, accessupto, subdistrictcodes, districtcodes } = params;
    let groupBy = {}, match = {}, masterApi = {};

    if (fromDate && toDate) {
      match['updatedAt'] = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    if (accessupto === 'National') {
      masterApi.type = "getStates";
      groupBy = { statename: "$statename", statecode: "$statecode" };
      if (statecodes && statecodes.length >= 1) {
        match['state_id.statecode'] = { $in: statecodes };
      }
      if (districtcodes && districtcodes.length >= 1) {
        masterApi.type = "getDistricts";
        match['district_id.districtcode'] = { $in: districtcodes };
        groupBy = { districtname: "$districtname", districtcode: "$districtcode" };
      }
      if (subdistrictcodes && subdistrictcodes.length >= 1) {
        masterApi.type = 'getSubDistricts';
        match["block_id.subdistrictcode"] = { $in: subdistrictcodes };
        groupBy = { subdistrictname: "$subdistrictname", subdistrictcode: "$subdistrictcode" };
      }
    }
    else if (accessupto === 'State') {
      masterApi.type = "getDistricts";
      match['state_id.statecode'] = { $in: statecodes };
      groupBy = { districtname: "$districtname", districtcode: "$districtcode" };
      if (districtcodes && districtcodes.length >= 1) {
        match['district_id.districtcode'] = { $in: districtcodes };
      }
      if (subdistrictcodes && subdistrictcodes.length >= 1) {
        masterApi.type = 'getSubDistricts';
        match["block_id.subdistrictcode"] = { $in: subdistrictcodes };
        groupBy = { subdistrictname: "$subdistrictname", subdistrictcode: "$subdistrictcode" };
      }
    }
    else if (accessupto === 'District') {
      masterApi.type = "getSubDistricts";
      match['district_id.districtcode'] = { $in: districtcodes };
      groupBy = { subdistrictname: "$subdistrictname", subdistrictcode: "$subdistrictcode" };
      if (subdistrictcodes && subdistrictcodes.length >= 1) {
        match["block_id.subdistrictcode"] = { $in: subdistrictcodes };
      }
    }

    try {
      const data = await Mdsrform1Collection.aggregate([
        {
          $match: match
        },
        {
          $lookup: {
            from: "mdsr_form_2",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "form2"
          }
        },
        {
          $lookup: {
            from: "mdsr_form_3",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "form3"
          }
        },
        {
          $lookup: {
            from: "mdsr_form_4",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "form4"
          }
        },
        {
          $lookup: {
            from: "mdsr_form_5",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "form5"
          }
        },
        {
          $lookup: {
            from: "mdsr_form_6",
            localField: "_id",
            foreignField: "deceased_women_id",
            as: "form6"
          }
        },
        {
          $project: {
            statecode: "$state_id.statecode",
            statename: "$state_id.statename",
            districtcode: "$district_id.districtcode",
            districtname: "$district_id.districtname",
            subdistrictcode: "$block_id.subdistrictcode",
            subdistrictname: "$block_id.subdistrictname",
            form2: { $cond: [{ $gt: [{ $size: "$form2" }, 0] }, 1, 0] },
            form3: { $cond: [{ $gt: [{ $size: "$form3" }, 0] }, 1, 0] },
            form4: { $cond: [{ $gt: [{ $size: "$form4" }, 0] }, 1, 0] },
            form5: { $cond: [{ $gt: [{ $size: "$form5" }, 0] }, 1, 0] },
            form6: { $cond: [{ $gt: [{ $size: "$form6" }, 0] }, 1, 0] },
            cbmdsr: {
              $cond: [{
                $and: [
                  { $gt: [{ $size: "$form4" }, 0] },
                  { $gt: [{ $size: "$form5" }, 0] }
                ]
              }, 1, 0]
            },
          }
        },
        {
          $group: {
            _id: groupBy,
            form1: { $sum: 1 },
            form2: { $sum: "$form2" },
            form3: { $sum: "$form3" },
            form4: { $sum: "$form4" },
            form5: { $sum: "$form5" },
            form6: { $sum: "$form6" },
            fbmdsr: { $sum: "$form4" },
            cbmdsr: { $sum: "$cbmdsr" }
          }
        },
        {
          $project: {
            form1: 1,
            form2: 1,
            form3: 1,
            form4: 1,
            form5: 1,
            form6: 1,
            fbmdsr: 1,
            cbmdsr: 1,
            percent: { $round: [{ $multiply: [{ $cond: [{ $eq: ["$cbmdsr", 0] }, null, { "$divide": ["$cbmdsr", "$form4"] }] }, 100] }, 2] }
          }
        }
      ],
        {
          allowDiskUse: true
        }).toArray();

      const response = [];
      for (let item of data) {
        const record = {
          form1: item.form1,
          form2: item.form2,
          form3: item.form3,
          form4: item.form4,
          form5: item.form5,
          form6: item.form6,
          fbmdsr: item.fbmdsr,
          cbmdsr: item.cbmdsr,
          percent: item.percent == null ? 0 : item.percent
        };

        if (masterApi.type === "getStates") {
          const steteInfo = await stateModel.findOne({ where: { statecode: item?._id?.statecode, statename: item?._id?.statename } });

          if (steteInfo) {
            response.push({ ...record, statename: steteInfo.statename, statecode: steteInfo.statecode });
          }
        }
        else if (masterApi.type === 'getDistricts') {
          const districtInfo = await districtModel.findOne({ where: { districtcode: item?._id?.districtcode, districtname: item?._id?.districtname } });
          if (districtInfo) {
            response.push({
              ...record, districtname: districtInfo?.districtname, districtcode: districtInfo?.districtcode,
              statename: districtInfo?.stateName, statecode: districtInfo?.stateCode
            });
          }
        }
        else if (masterApi.type === 'getSubDistricts') {
          const blockInfo = await subdistrictModel.findOne({ where: { subdistrictcode: item?._id?.subdistrictcode, subdistrictname: item?._id?.subdistrictname } });
          if (blockInfo) {
            response.push({
              ...record, subdistrictname: blockInfo?.subdistrictname, subdistrictcode: blockInfo?.subdistrictcode,
              statename: blockInfo?.statename, statecode: blockInfo?.statecode,
              districtname: blockInfo?.districtname, districtcode: blockInfo?.districtcode
            });
          }
        }
      }

      return response;

    } catch (error) {
      return error;
    }
  }

  Mdsrform1.remoteMethod('countCbmdsrOutofFbmdsr', {
    description: 'Out of FBMDR How many CBMDR Has been submitted',
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
