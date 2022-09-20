'use strict';

module.exports = function (Icd10code) {
  Icd10code.getCodesCategorywise = function (params, cb) {
    var self = this;
    var Icd10codeCollection = self.getDataSource().connector.collection(Icd10code.modelName);
    let cursor = Icd10codeCollection.aggregate(

      // Pipeline
      [
        // Stage 1
        {
          $group: {
            _id: {},
            "abortion": {
              "$addToSet": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$eq": [
                          "$type",
                          "Direct Cause"
                        ]
                      },
                      {
                        "$eq": [
                          "$icd_category",
                          "Abortion"
                        ]
                      }
                    ]
                  },
                  "$icd_code",
                  0
                ]
              }
            },
            "Hypertension": {
              "$addToSet": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$eq": [
                          "$type",
                          "Direct Cause"
                        ]
                      },
                      {
                        "$eq": [
                          "$icd_category",
                          "Essential Hypertension"
                        ]
                      }
                    ]
                  },
                  "$icd_code",
                  0
                ]
              }
            },
            "sepsis": {
              "$addToSet": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$eq": [
                          "$type",
                          "Direct Cause"
                        ]
                      },
                      {
                        "$eq": [
                          "$icd_category",
                          "Puerperal sepsis"
                        ]
                      }
                    ]
                  },
                  "$icd_code",
                  0
                ]
              }
            },
            "haemorrhage": {
              "$addToSet": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$eq": [
                          "$type",
                          "Direct Cause"
                        ]
                      },
                      {
                        "$eq": [
                          "$icd_category",
                          "Postpartum haemorrhage"
                        ]
                      }
                    ]
                  },
                  "$icd_code",
                  0
                ]
              }
            },
            "Embolism": {
              "$addToSet": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$eq": [
                          "$type",
                          "Direct Cause"
                        ]
                      },
                      {
                        "$eq": [
                          "$icd_category",
                          "Amniotic Fluid Embolism"
                        ]
                      }
                    ]
                  },
                  "$icd_code",
                  0
                ]
              }
            },
			"ObstructedLabour": {
              "$addToSet": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$eq": [
                          "$type",
                          "Direct Cause"
                        ]
                      },
                      {
                        "$eq": [
                          "$icd_category",
                          "Chorioamnionitis without or with obstructed labour / prolonged labour"
                        ]
                      }
                    ]
                  },
                  "$icd_code",
                  0
                ]
              }
            },
            "IndirectCause": {
              "$addToSet": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$eq": [
                          "$type",
                          "Indirect Cause"
                        ]
                      }
                    ]
                  },
                  "$icd_code",
                  0
                ]
              }
            },
            "OtherDirectCause": {
              "$addToSet": {
                "$cond": [
                  {
                    "$and": [
                      {
                        "$eq": [
                          "$type",
                          "Direct Cause"
                        ]
                      },
                      {
                        "$ne": [
                          "$icd_category",
                          "Abortion"
                        ]
                      },
                      {
                        "$ne": [
                          "$icd_category",
                          "Essential Hypertension"
                        ]
                      },
                      {
                        "$ne": [
                          "$icd_category",
                          "Puerperal sepsis"
                        ]
                      },
                      {
                        "$ne": [
                          "$icd_category",
                          "Postpartum haemorrhage"
                        ]
                      },
                      {
                        "$ne": [
                          "$icd_category",
                          "Amniotic Fluid Embolism"
                        ]
                      }
                    ]
                  },
                  "$icd_code",
                  0
                ]
              }
            }
          }
        }
      ]
    );
    cursor.get(function (err, data) {
      if (err) return cb(err);
      return cb(false, data);
    });

  }

  Icd10code.remoteMethod(
    'getCodesCategorywise', {
    description: "getCodesCategorywise",
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

  Icd10code.getGroupName = async function (params) {
    const groupNames = await Icd10code.aggregate({
      where: { type: params.type },
      aggregate: [
        {
          $group: {
            _id: { "group_name": "$group_name" }
          }
        }, {
          $project: {
            _id: 0,
            label: "$_id.group_name",
            value: "$_id.group_name"
          }
        }, {
          $sort: {
            value: 1
          }
        }
      ]
    });
    return groupNames && groupNames.length > 0 ? groupNames : [];
  }

  Icd10code.remoteMethod(
    'getGroupName', {
    description: "get Group Name unique",
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

  Icd10code.getGroupCategory = async function (params) {
    const groupCategory = await Icd10code.aggregate({
      where: { type: params.type, group_name: params.group_name },
      aggregate: [
        {
          $group: {
            _id: { "icd_category": "$icd_category" }
          }
        }, {
          $project: {
            _id: 0,
            label: "$_id.icd_category",
            value: "$_id.icd_category"
          }
        }, {
          $sort: {
            value: 1
          }
        }
      ]
    });
    return groupCategory && groupCategory.length > 0 ? groupCategory : [];
  }

  Icd10code.remoteMethod(
    'getGroupCategory', {
    description: "get Group Category unique",
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

  Icd10code.getSubGroupCategory = async function (params) {
    const subGroupCategory = await Icd10code.aggregate({
      where: { type: params.type, group_name: params.group_name, icd_category:params.icd_category },
      aggregate: [
        {
          $group: {
            _id: { "icd_sub_category": "$icd_sub_category" }
          }
        }, {
          $project: {
            _id: 0,
            label: "$_id.icd_sub_category",
            value: "$_id.icd_sub_category"
          }
        }, {
          $sort: {
            value: 1
          }
        }
      ]
    });
    return subGroupCategory && subGroupCategory.length > 0 ? subGroupCategory : [];
  }

  Icd10code.remoteMethod(
    'getSubGroupCategory', {
    description: "get SubGroup Category unique",
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
}
