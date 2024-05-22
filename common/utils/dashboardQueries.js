const async = require("async");

const getCDRDeathAgeWiseDeath = async (CdrForm1Aggregate, parmas) => {
  return new Promise((resolve, reject) => {
    const cursor = CdrForm1Aggregate.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $project: {
            days: {
              $trunc: {
                $divide: [
                  { $subtract: ["$date_of_death", "$date_of_birth"] },
                  { $multiply: [1000, 60, 60, 24] },
                ],
              },
            },
          },
        },

        // Stage 2
        {
          $group: {
            _id: null,
            zeroTo1_Days_CDR_Death: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $lte: ["$days", 1] }],
                  },
                  1,
                  0,
                ],
              },
            },
            zeroTo7_Days_CDR_Death: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $lte: ["$days", 7] }],
                  },
                  1,
                  0,
                ],
              },
            },
            zeroTo28_Days_CDR_Death: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $lte: ["$days", 28] }],
                  },
                  1,
                  0,
                ],
              },
            },
            zeroTo1_Years_CDR_Death: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $lte: ["$days", { $multiply: [365, 1] }] }],
                  },
                  1,
                  0,
                ],
              },
            },
            zeroTo5_Years_CDR_Death: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $lte: ["$days", { $multiply: [365, 5] }] }],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ],

      // Options
      {
        cursor: {
          batchSize: 50,
        },

        allowDiskUse: true,
      }
    );
    cursor.get((err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const getCDRDeathAndVerifiedCount = async (CdrForm1Aggregate, params) => {
  return new Promise((resolve, reject) => {
    const cursor = CdrForm1Aggregate.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $lookup: {
            from: "cdr_form_2",
            localField: "_id",
            foreignField: "cdr_id",
            as: "fbir",
          },
        },

        // Stage 2
        {
          $group: {
            _id: null,
            cdrReported: { $sum: 1 },
            cdrVerified: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $gte: [{ $size: "$fbir" }, 1] }],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ],
      // Options
      {
        cursor: {
          batchSize: 50,
        },

        allowDiskUse: true,
      }
    );

    cursor.get((err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const getCDRDeathForMapData = async (Cdrform1,CdrForm1Aggregate, {params}) => {
  return new Promise((resolve, reject) => {
    async.parallel(
      {
        master: (callback) => {
          Cdrform1.app.models.Ihipaccess.getIhipAccessToken(
            {
              accesstype: "new",
              oldAccessToken: "",
            },
            (err, res) => {
              let obj = {
                // accessToken: res.ihipAccessToken,
              };
              if (params.type === "getDistricts") {
                obj.type = "getDistricts";
                if (params.hasOwnProperty("statecode")) {
                  obj.statecode = params.statecode;
                }
              } else {
                obj.type = "getStates";
              }

              Cdrform1.app.models.Ihipaccess.getIhipData(
                { accessToken: res.ihipAccessToken },
                obj,
                (err, ihipData) => {
                  callback(null, ihipData);
                }
              );
            }
          );
        },
        actualReporting: function (callback) {
          let match = {};

          let group = {
            _id: {
              statecode: "$address.statecode",
              statename: "$address.statename",
            },
            actual: {
              $sum: 1,
            },
          };

          let project = {
            statecode: "$_id.statecode",
            statename: "$_id.statename",
            actual: 1,
            _id: 0,
          };

          console.log("Params ---> ",params)
          if (params.type === "getDistricts") {
            if (params.statecode) {
              if (params.statecode.length !== 0) {
                console.log("Setting the state code...")
                match["address.statecode"] = {
                  $in: params.statecode,
                };
              }
            }
            group["_id"]["districtcode"] = "$address.districtcode";
            group["_id"]["districtname"] = "$address.districtname";
            project["districtcode"] = "$_id.districtcode";
            project["districtname"] = "$_id.districtname";
          }
          console.log("Project")
          console.log(JSON.stringify(project))       
          console.log("Group")
          console.log(JSON.stringify(group))       
          console.log("match")
          console.log(JSON.stringify(match))       
          let cursor = CdrForm1Aggregate.aggregate(
            // Pipeline
            [
              // Stage 1
              {
                $match: match,
              },
              // Stage 2
              {
                $group: group,
              },
              // Stage 3
              {
                $project: project,
              },
            ],
            // Options
            {
              cursor: {
                batchSize: 50,
              },
            }
          );
          cursor.get(function (err, data) {
            console.log("Result is Acutal Data => ",data);
            callback(null, data);
          });
        },
      },
      function (err, results) {
        if(err) reject(err);    
        resolve(results)
      }
    );
  });
};
module.exports = {
  getCDRDeathAgeWiseDeath,
  getCDRDeathAndVerifiedCount,
  getCDRDeathForMapData
};
