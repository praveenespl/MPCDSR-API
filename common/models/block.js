'use strict';
const app = require("../../server/server");
module.exports = function (Block) {
  Block.mapdata = async function () {
    const block = app.models.subdistrict;
    const sncuBlock = app.models.block;
    const sncuRecord = await sncuBlock.find({});
    const blocks = await block.find({});
    let sncuBlockCollection = Block.getDataSource().connector.collection(sncuBlock.modelName);

    // const response = sncuRecord.filter(async(item) => {
    //   const obj = blocks.find(record => record?.statename?.trim().toLowerCase() == "west bengal" && item?.state_name?.trim().toLowerCase() == "west bengal");
    //   if (obj !== undefined) {
    //     await sncuBlockCollection.updateOne({ "_id": item.id }, {
    //       $set: {
    //         "statecode": obj.statecode,
    //         "statename": obj.statename,
    //         "directMatch": false
    //       }
    //     });
    //     return obj;
    //   }
    // });


    // const response = sncuRecord.filter(async(item) => {
    //   const obj = blocks.find(record => record?.statename?.trim().toLowerCase() == "west bengal" && item?.state_name?.trim().toLowerCase() == "west bengal" && 
    //     record?.districtname?.trim().toLowerCase() == item?.district_name?.trim().toLowerCase());
    //   if (obj !== undefined) {
    //     //console.log('----',obj,item)
    //     await sncuBlockCollection.updateOne({ "_id": item.id }, {
    //       $set: {
    //         "statecode": obj.statecode,
    //         "statename": obj.statename,
    //         "districtcode": obj.districtcode,
    //         "districtname": obj.districtname,   
    //         "directMatch": false
    //       }
    //     });
    //     return obj;
    //   }
    // });
    
    const response = sncuRecord.filter(async (item) => {
        const obj = blocks.find(record => item.block_name?.toLowerCase().trim() == record.subdistrictname?.toLowerCase().trim() &&
            item.districtname?.toLowerCase().trim() == record.districtname?.toLowerCase().trim() &&
            item.statename?.toLowerCase().trim() == record.statename?.toLowerCase().trim());
      if (obj != undefined) {
          console.log("obj",obj)
            await sncuBlockCollection.updateOne({ "_id": item.id }, {
                $set: {
                    "statecode": obj.statecode,
                    "statename": obj.statename,
                    "districtcode": obj.districtcode,
                    "districtname": obj.districtname,
                    "subdistrictcode": obj.subdistrictcode,
                    "subdistrictname":obj.subdistrictname,
                    "directMatch": true
                }
            });
            return obj;
        }
    });
    
   


    return response;
   };

  Block.remoteMethod("mapdata", {
    description: "mapdata",
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
