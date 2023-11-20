'use strict';
const { ObjectID } = require("loopback-connector-mongodb");
const app = require("../../server/server");
module.exports = function(Cdrform3) {
    Cdrform3.observe("before save", async function (ctx) {
      const cdrForm3BCollectoin = app.models.cdr_form_3;
      if (ctx.isNewInstance) {
        const data = ctx.instance;
        const newRecord = await cdrForm3BCollectoin.find({
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
      }
      });
};
