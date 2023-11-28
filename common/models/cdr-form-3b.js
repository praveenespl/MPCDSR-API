'use strict';
const { ObjectID } = require("loopback-connector-mongodb");
const app = require("../../server/server");
module.exports = function (Cdrform3b) {
  Cdrform3b.observe("before save", async function (ctx) {
    let record = ctx.isNewInstance === true ? ctx.instance : ctx.currentInstance;
    const cdrFormTwoCollectoin = app.models.cdr_form_3b;
    if (ctx.isNewInstance) {
      const newRecord = await cdrFormTwoCollectoin.find({
        where: {
          cdr_id: new ObjectID(record.cdr_id)
        }
      });

      if (newRecord.length > 0) {
        let err = new Error('This Record already exists!');
        err.statusCode = 402;
        throw err
      }
    }
    return;
  });

};
