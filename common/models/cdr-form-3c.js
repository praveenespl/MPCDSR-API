"use strict";
const app = require("../../server/server");
function daysCalculation(death, birth) {
  const date1 = new Date(death);
  const date2 = new Date(birth);
  const Difference_In_Time = date1.getTime() - date2.getTime();
  const days = Difference_In_Time / (1000 * 3600 * 24);
  return days;
}

module.exports = function (Cdrform3c) {
  Cdrform3c.observe("after save", async function (ctx) {
    let update = {},
      data = {};
    if (ctx.isNewInstance) {
      data = ctx.instance;
    } else {
      data = ctx.data;
    }
    const form3ACollection = app.models.cdr_form_3;
    const form3BCollection = app.models.cdr_form_3b;
    const form1Collection = app.models.cdr_form_1;

    const form3aRecord = await form3ACollection.findOne({
      where: { cdr_id: data.cdr_id },
    });
    const form3bRecord = await form3BCollection.findOne({
      where: { cdr_id: data.cdr_id },
    });
    const form1Record = await form1Collection.findOne({
      where: { _id: data.cdr_id },
    });

    if ((form1Record.sex == "Female" || form1Record.sex == "female") && data && (form3aRecord || form3bRecord)) {
        update["autopsy_female"] = 1;
        update["autopsy_male"] = 0;
        update["autopsy_ambiguous"] = 0;
    }
    if ((form1Record.sex == "Male" || form1Record.sex == "male") && data && (form3aRecord || form3bRecord)) {
        update["autopsy_female"] = 0;
        update["autopsy_male"] = 1;
        update["autopsy_ambiguous"] = 0;
    }
    if ((form1Record.sex == "Ambiguous" || form1Record.sex == "ambiguous") && data && (form3aRecord || form3bRecord)) {
        update["autopsy_female"] = 0;
        update["autopsy_male"] = 0;
        update["autopsy_ambiguous"] = 1;
    }
    if(data && (form3aRecord || form3bRecord)){
        if((form3aRecord?.sectionA.category=="General" || form3bRecord?.sectionA.category=="General")){
            update["autopsy_general"]=1;
            update["autopsy_obc"]=0;
            update["autopsy_sc"]=0;
            update["autopsy_st"]=0;
            update["autopsy_na"]=0;
        }
        if((form3aRecord?.sectionA.category=="OBC" || form3bRecord?.sectionA.category=="OBC")){
            update["autopsy_general"]=0;
            update["autopsy_obc"]=1;
            update["autopsy_sc"]=0;
            update["autopsy_st"]=0;
            update["autopsy_na"]=0;
        }
        if((form3aRecord?.sectionA.category=="SC" || form3bRecord?.sectionA.category=="SC")){
            update["autopsy_general"]=0;
            update["autopsy_obc"]=0;
            update["autopsy_sc"]=1;
            update["autopsy_st"]=0;
            update["autopsy_na"]=0;
        }
        if((form3aRecord?.sectionA.category=="ST" || form3bRecord?.sectionA.category=="ST")){
            update["autopsy_general"]=0;
            update["autopsy_obc"]=0;
            update["autopsy_sc"]=0;
            update["autopsy_st"]=1;
            update["autopsy_na"]=0;
        }
        if((form3aRecord?.sectionA.category=="General" || form3bRecord?.sectionA.category=="General")){
            update["autopsy_general"]=0;
            update["autopsy_obc"]=0;
            update["autopsy_sc"]=0;
            update["autopsy_st"]=0;
            update["autopsy_na"]=1;
        }
    }
    if(data && (form3aRecord || form3bRecord)){
        update["autopsy_total"]=1;
        if (
            daysCalculation(form1Record.date_of_death, form1Record.date_of_birth) >= 0 &&
            daysCalculation(form1Record.date_of_death, form1Record.date_of_birth) <= 28
          ) {
            update["autopsy_lessThanOneMonth"] = 1;
            update["autopsy_lessThanOneYear"] = 0;
            update["autopsy_lessThanFiveYear"] = 0;
          }
          if (
            daysCalculation(form1Record.date_of_death, form1Record.date_of_birth) >= 29 &&
            daysCalculation(form1Record.date_of_death, form1Record.date_of_birth) < 366
          ) {
            update["autopsy_lessThanOneMonth"] = 0;
            update["autopsy_lessThanOneYear"] = 1;
            update["autopsy_lessThanFiveYear"] = 0;
          }
          if (
            daysCalculation(form1Record.date_of_death, form1Record.date_of_birth) >= 366 &&
            daysCalculation(form1Record.date_of_death, form1Record.date_of_birth) <= 1827
          ) {
            update["autopsy_lessThanOneMonth"] = 0;
            update["autopsy_lessThanOneYear"] = 0;
            update["autopsy_lessThanFiveYear"] = 1;
          }
    }
    console.log("update",update)
    const goiReportCollection = app.models.goi_report;
    await goiReportCollection.update({ cdr_id: data.cdr_id }, update);
  });
};
