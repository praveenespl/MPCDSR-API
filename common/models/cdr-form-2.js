"use strict";
const app = require("../../server/server");

function daysCalculation(death, birth) {
  const date1 = new Date(death);
  const date2 = new Date(birth);
  const Difference_In_Time = date1.getTime() - date2.getTime();
  const days = Difference_In_Time / (1000 * 3600 * 24);
  return days;
}

module.exports = function (Cdrform2) {
  Cdrform2.observe("after save", async function (ctx) {
    let update = {},
      data = {};
    if (ctx.isNewInstance) {
      data = ctx.instance;
    } else if (ctx.instance) {
      data = ctx.instance;
    } else {
      data = ctx.data;
    }
    if (data.sectionD.delay_in_transportation) {
      update["delayInTransportation"] = 1;
      update["delayAtHome"] = 0;
      update["delayAtFacility"] = 0;
    }
    if (data.sectionD.delay_at_home) {
      update["delayInTransportation"] = 0;
      update["delayAtHome"] = 1;
      update["delayAtFacility"] = 0;
    }
    if (data.sectionD.delay_at_facility) {
      update["delayInTransportation"] = 0;
      update["delayAtHome"] = 0;
      update["delayAtFacility"] = 1;
    }
    if (data.sectionA.belongs_to == "General") {
      update["cbcdrGeneral"] = 1;
      update["cbcdrOBC"] = 0;
      update["cbcdrSC"] = 0;
      update["cbcdrST"] = 0;
      update["cbcdrNA"] = 0;
      update["General"] = 1;
      update["OBC"] = 0;
      update["SC"] = 0;
      update["ST"] = 0;
      update["NA"] = 0;
    }
    if (data.sectionA.belongs_to == "OBC") {
      update["cbcdrGeneral"] = 0;
      update["cbcdrOBC"] = 1;
      update["cbcdrSC"] = 0;
      update["cbcdrST"] = 0;
      update["cbcdrNA"] = 0;
      update["General"] = 0;
      update["OBC"] = 1;
      update["SC"] = 0;
      update["ST"] = 0;
      update["NA"] = 0;
    }
    if (data.sectionA.belongs_to == "SC") {
      update["cbcdrGeneral"] = 0;
      update["cbcdrOBC"] = 0;
      update["cbcdrSC"] = 1;
      update["cbcdrST"] = 0;
      update["cbcdrNA"] = 0;
      update["General"] = 0;
      update["OBC"] = 0;
      update["SC"] = 1;
      update["ST"] = 0;
      update["NA"] = 0;
    }
    if (data.sectionA.belongs_to == "ST") {
      update["cbcdrGeneral"] = 0;
      update["cbcdrOBC"] = 0;
      update["cbcdrSC"] = 0;
      update["cbcdrST"] = 1;
      update["cbcdrNA"] = 0;
      update["General"] = 0;
      update["OBC"] = 0;
      update["SC"] = 0;
      update["ST"] = 1;
      update["NA"] = 0;
    }
    if (data.sectionA.belongs_to == "NA") {
      update["cbcdrGeneral"] = 0;
      update["cbcdrOBC"] = 0;
      update["cbcdrSC"] = 0;
      update["cbcdrST"] = 0;
      update["cbcdrNA"] = 1;
      update["General"] = 0;
      update["OBC"] = 0;
      update["SC"] = 0;
      update["ST"] = 0;
      update["NA"] = 1;
    }
    if (data.sectionD.delay_at_home == true) {
      update["delayAtHome"] = 1;
      update["delayInTransportation"] = 0;
      update["delayAtFacility"] = 0;
    }
    if (data.sectionD.delay_in_transportation == true) {
      update["delayAtHome"] = 0;
      update["delayInTransportation"] = 1;
      update["delayAtFacility"] = 0;
    }
    if (data.sectionD.delay_at_facility == true) {
      update["delayAtHome"] = 0;
      update["delayInTransportation"] = 0;
      update["delayAtFacility"] = 1;
    }
    if (data) {
      update["totalFbcdr"] = 0;
      update["totalCbcdr"] = 1;
      update["fbcdrGeneral"] = 0;
      update["fbcdrOBC"] = 0;
      update["fbcdrSC"] = 0;
      update["fbcdrST"] = 0;
      update["fbcdrNA"] = 0;
      update["fbcdrFemale"] = 0;
      update["fbcdrMale"] = 0;
      update["fbcdrAmbiguous"] = 0;
      update["fbcdrLessThanOneMonth"] = 0;
      update["fbcdrLessThanOneYear"] = 0;
      update["fbcdrLessThanFiveYear"] = 0;
    }
    const cdrForm1 = app.models.cdr_form_1;
    const record = await cdrForm1.findOne({ where: { _id: data.cdr_id } });
    if (record.sex === "Female" || record.sex === "female") {
      update["cbcdrFemale"] = 1;
      update["cbcdrMale"] = 0;
      update["cbcdrAmbiguous"] = 0;
    }
    if (record.sex === "Male" || record.sex === "male") {
      update["cbcdrFemale"] = 0;
      update["cbcdrMale"] = 1;
      update["cbcdrAmbiguous"] = 0;
    }
    if (record.sex === "Ambiguous" || record.sex === "ambiguous") {
      update["cbcdrFemale"] = 0;
      update["cbcdrMale"] = 0;
      update["cbcdrAmbiguous"] = 1;
    }
    if (
      daysCalculation(record.date_of_death, record.date_of_birth) >= 0 &&
      daysCalculation(record.date_of_death, record.date_of_birth) <= 28
    ) {
      update["cbcdrLessThanOneMonth"] = 1;
      update["cbcdrLessThanOneYear"] = 0;
      update["cbcdrLessThanFiveYear"] = 0;
    }
    if (
      daysCalculation(record.date_of_death, record.date_of_birth) >= 29 &&
      daysCalculation(record.date_of_death, record.date_of_birth) < 366
    ) {
      update["cbcdrLessThanOneMonth"] = 0;
      update["cbcdrLessThanOneYear"] = 1;
      update["cbcdrLessThanFiveYear"] = 0;
    }
    if (
      daysCalculation(record.date_of_death, record.date_of_birth) >= 366 &&
      daysCalculation(record.date_of_death, record.date_of_birth) <= 1827
    ) {
      update["cbcdrLessThanOneMonth"] = 0;
      update["cbcdrLessThanOneYear"] = 0;
      update["cbcdrLessThanFiveYear"] = 1;
    }
    console.log("update", update);
    const goiReportCollection = app.models.goi_report;
    await goiReportCollection.update({ cdr_id: data.cdr_id }, update);
  });

  Cdrform2.getCDRMajorCausesPrevious = async function (params) {
    let dmatch = {};
    let self = this;
    var Cdrform2Collection = self
      .getDataSource()
      .connector.collection(Cdrform2.modelName);
    if (params.accessupto == "National") {
      dmatch = {
        createdAt: {
          $gte: new Date(params.previousYearFromDate),
          $lte: new Date(params.previousYearToDate),
        },
      };
    } else if (params.accessupto == "State") {
      dmatch = {
        statecode: params.where.statecode,
        createdAt: {
          $gte: new Date(params.previousYearFromDate),
          $lte: new Date(params.previousYearToDate),
        },
      };
    } else if (params.accessupto == "District") {
      dmatch = {
        districtcode: params.where.districtcode,
        createdAt: {
          $gte: new Date(params.previousYearFromDate),
          $lte: new Date(params.previousYearToDate),
        },
      };
    }

    let cursor = await Cdrform2Collection.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: dmatch,
        },

        // Stage 2
        {
          $project: {
            districtcode: "$districtcode",
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            sectionB: "$sectionB",
          },
        },

        // Stage 3
        {
          $group: {
            _id: 0,
            diarrhoea: {
              $sum: {
                $cond: [{ $eq: ["$sectionB.diarrhoea", true] }, 1, 0],
              },
            },
            pneumonia: {
              $sum: {
                $cond: [{ $eq: ["$sectionB.pneumonia", true] }, 1, 0],
              },
            },
            malaria: {
              $sum: {
                $cond: [{ $eq: ["$sectionB.malaria", true] }, 1, 0],
              },
            },
            measles: {
              $sum: {
                $cond: [{ $eq: ["$sectionB.measles", true] }, 1, 0],
              },
            },
            septicemia: {
              $sum: {
                $cond: [{ $eq: ["$sectionB.septicemia", true] }, 1, 0],
              },
            },
            meningitis: {
              $sum: {
                $cond: [{ $eq: ["$sectionB.meningitis", true] }, 1, 0],
              },
            },
            injury: {
              $sum: {
                $cond: [{ $eq: ["$sectionB.injury", true] }, 1, 0],
              },
            },
            // other : {
            // $sum: {
            //      $cond: [
            //               { $eq: ["$sectionB.other", "Head Injury"] }, 1, 0
            //             ]
            //        }
            // },
          },
        },

        // Stage 4
        {
          $project: {
            _id: 0,
            month: "$_id.month",
            year: "$_id.year",
            diarrhoea: 1,
            pneumonia: 1,
            malaria: 1,
            measles: 1,
            septicemia: 1,
            meningitis: 1,
            injury: 1,
            other: 1,
          },
        },
      ]
    ).toArray();

    return cursor;
  };

  Cdrform2.remoteMethod("getCDRMajorCausesPrevious", {
    description: "",
    description: "getCDRMajorCausesPrevious",
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
  });
};
