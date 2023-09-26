'use strict';

module.exports = function(Cdrform3b) {
    Cdrform3b.observe("before save", async function (ctx) {
        const data = ctx.instance;
        const cdrFormTwoCollectoin = app.models.cdr_form_3b;
        const newRecord = await cdrFormTwoCollectoin.find({
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
    
};
