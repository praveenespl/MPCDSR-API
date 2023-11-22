"use strict";
const app = require("../../server/server");
const { ObjectID } = require("loopback-connector-mongodb");
function daysCalculation(death, birth) {
  const date1 = new Date(death);
  const date2 = new Date(birth);
  const Difference_In_Time = date1.getTime() - date2.getTime();
  const days = Difference_In_Time / (1000 * 3600 * 24);
  return days;
}

module.exports = function (Cdrform4a) {
  Cdrform4a.observe("before save", async function (ctx) {
    let data
    if (ctx.isNewInstance){
       data = ctx.instance;
    }else{
       data=ctx.data;
    }
    const cdrForm4ACollectoin = app.models.cdr_form_4a;
    const newRecord = await cdrForm4ACollectoin.find({
      where: {
        cdr_id: new ObjectID(data.cdr_id)
      }
    });

    if (newRecord.length > 0) {
      let err = new Error('This Record already exists!');
      err.statusCode = 402;
      throw err
    }
    return;
  });

  Cdrform4a.observe("after save", async function (ctx) {
    let update = {},
      data = {};
    if (ctx.isNewInstance) {
      data = ctx.instance;
    } else {
      data = ctx.instance;
    }
    if (
      data.sectionA.category == "General" ||
      data.sectionA.category == "general"
    ) {
      update["fbcdrGeneral"] = 1;
      update["fbcdrOBC"] = 0;
      update["fbcdrSC"] = 0;
      update["fbcdrST"] = 0;
      update["fbcdrNA"] = 0;
      update["General"] = 1;
      update["OBC"] = 0;
      update["SC"] = 0;
      update["ST"] = 0;
      update["NA"] = 0;
    }
    if (data.sectionA.category == "OBC" || data.sectionA.category == "obc") {
      update["fbcdrGeneral"] = 0;
      update["fbcdrOBC"] = 1;
      update["fbcdrSC"] = 0;
      update["fbcdrST"] = 0;
      update["fbcdrNA"] = 0;
      update["General"] = 0;
      update["OBC"] = 1;
      update["SC"] = 0;
      update["ST"] = 0;
      update["NA"] = 0;
    }
    if (data.sectionA.category == "SC" || data.sectionA.category == "sc") {
      update["fbcdrSC"] = 1;
      update["fbcdrGeneral"] = 0;
      update["fbcdrOBC"] = 0;
      update["fbcdrSC"] = 0;
      update["fbcdrNA"] = 0;
      update["General"] = 0;
      update["OBC"] = 0;
      update["SC"] = 1;
      update["ST"] = 0;
      update["NA"] = 0;
    }
    if (data.sectionA.category == "ST" || data.sectionA.category == "st") {
      update["fbcdrST"] = 1;
      update["fbcdrGeneral"] = 0;
      update["fbcdrOBC"] = 0;
      update["fbcdrSC"] = 0;
      update["fbcdrNA"] = 0;
      update["General"] = 0;
      update["OBC"] = 0;
      update["SC"] = 0;
      update["ST"] = 1;
      update["NA"] = 0;
    }
    if (data.sectionA.category == "NA" || data.sectionA.category == "Na") {
      update["fbcdrNA"] = 1;
      update["fbcdrGeneral"] = 0;
      update["fbcdrOBC"] = 0;
      update["fbcdrSC"] = 0;
      update["fbcdrST"] = 0;
      update["General"] = 0;
      update["OBC"] = 0;
      update["SC"] = 0;
      update["ST"] = 0;
      update["NA"] = 1;
    }
    if (data) {
      update["totalFbcdr"] = 1;
      update["totalCbcdr"] = 0;
      update["cbcdrGeneral"] = 0;
      update["cbcdrOBC"] = 0;
      update["cbcdrSC"] = 0;
      update["cbcdrST"] = 0;
      update["cbcdrNA"] = 0;
      update["cbcdrFemale"] = 0;
      update["cbcdrMale"] = 0;
      update["cbcdrAmbiguous"] = 0;
      update["cbcdrLessThanOneMonth"] = 0;
      update["cbcdrLessThanOneYear"] = 0;
      update["cbcdrLessThanFiveYear"] = 0;
      update["delayAtHome"]=0;
      update["delayInTransportation"]=0;
      update["delayAtFacility"]=0;
      update["autopsy_ambiguous"]=0;
      update["autopsy_female"]=0;
      update["autopsy_male"]=0;
      update["autopsy_general"]=0;
      update["autopsy_obc"]=0;
      update["autopsy_sc"]=0;
      update["autopsy_st"]=0;
      update["autopsy_na"]=0;
      update["autopsy_total"]=0;
      update["autopsy_lessThanFiveYear"]=0;
      update["autopsy_lessThanOneMonth"]=0;
      update["autopsy_lessThanOneYear"]=0;
    }
    const form1Collection = app.models.cdr_form_1;
    const record = await form1Collection.findOne({
      where: { _id: data.cdr_id },
    });
    if (record.sex == "Female" || record.sex == "female") {
      update["fbcdrFemale"] = 1;
      update["fbcdrMale"] = 0;
      update["fbcdrAmbiguous"] = 0;
    }
    if (record.sex == "Male" || record.sex == "male") {
      update["fbcdrFemale"] = 0;
      update["fbcdrMale"] = 1;
      update["fbcdrAmbiguous"] = 0;
    }
    if (record.sex == "Ambiguous" || record.sex == "ambiguous") {
      update["fbcdrFemale"] = 0;
      update["fbcdrMale"] = 0;
      update["fbcdrAmbiguous"] = 1;
    }
    if (
      daysCalculation(record.date_of_death, record.date_of_birth) >= 0 &&
      daysCalculation(record.date_of_death, record.date_of_birth) <= 28
    ) {
      update["fbcdrLessThanOneMonth"] = 1;
      update["fbcdrLessThanOneYear"] = 0;
      update["fbcdrLessThanFiveYear"] = 0;
    }
    if (
      daysCalculation(record.date_of_death, record.date_of_birth) >= 29 &&
      daysCalculation(record.date_of_death, record.date_of_birth) < 366
    ) {
      update["fbcdrLessThanOneMonth"] = 0;
      update["fbcdrLessThanOneYear"] = 1;
      update["fbcdrLessThanFiveYear"] = 0;
    }
    if (
      daysCalculation(record.date_of_death, record.date_of_birth) >= 366 &&
      daysCalculation(record.date_of_death, record.date_of_birth) <= 1827
    ) {
      update["fbcdrLessThanOneMonth"] = 0;
      update["fbcdrLessThanOneYear"] = 0;
      update["fbcdrLessThanFiveYear"] = 1;
    }
    console.log("update",update)
    const goiReportCollection = app.models.goi_report;
    await goiReportCollection.update({ cdr_id: data.cdr_id }, update);
  });
};
