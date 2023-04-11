'use strict';

module.exports = function(Cdrform2) {

    Cdrform2.getCDRMajorCausesPrevious =async function (params) {
     
      let dmatch={};
        let self = this;
    var Cdrform2Collection = self.getDataSource().connector.collection(Cdrform2.modelName);
        if(params.accessupto =="National"){
          dmatch ={
            createdAt : {'$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) }
        }
       
        }else if(params.accessupto =="State"){
          dmatch ={
            statecode : params.where.statecode,
            createdAt : {'$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) }
        }
        }else if(params.accessupto =="District"){
          dmatch ={
            districtcode : params.where.districtcode,
            createdAt : {'$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) }
        }
        }
       

    let cursor = await Cdrform2Collection.aggregate(
      // Pipeline
      [
          
    // Stage 1
    {
        $match: dmatch
        
      },
  
      // Stage 2
      {
        $project: {
                           districtcode: "$districtcode",
                        month: { "$month": "$createdAt" },
                        year: { "$year": "$createdAt" },
                        sectionB : "$sectionB"
                      }
        
      },
  
      // Stage 3
      {
        $group: {
        _id: 0,
              diarrhoea: {
                $sum: {
                     $cond: [
                              { $eq: ["$sectionB.diarrhoea", true] }, 1, 0
                            ]
                       }
                },
                pneumonia: {
                $sum: {
                     $cond: [
                              { $eq: ["$sectionB.pneumonia", true] }, 1, 0
                            ]
                       }
                }, 
                malaria: {
                $sum: {
                     $cond: [
                              { $eq: ["$sectionB.malaria", true] }, 1, 0
                            ]
                       }
                },
                 measles: {
                $sum: {
                     $cond: [
                              { $eq: ["$sectionB.measles", true] }, 1, 0
                            ]
                       }
                },
                 septicemia: {
                $sum: {
                     $cond: [
                              { $eq: ["$sectionB.septicemia", true] }, 1, 0
                            ]
                       }
                },
                 meningitis: {
                $sum: {
                     $cond: [
                              { $eq: ["$sectionB.meningitis", true] }, 1, 0
                            ]
                       }
                },
                 injury: {
                $sum: {
                     $cond: [
                              { $eq: ["$sectionB.injury", true] }, 1, 0
                            ]
                       }
                },
                // other : {
                // $sum: {
                //      $cond: [
                //               { $eq: ["$sectionB.other", "Head Injury"] }, 1, 0
                //             ]
                //        }
                // },
        }
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
              other: 1
        }
      }   
      ]
    ).toArray();
 
      return cursor
 
    }

    Cdrform2.remoteMethod("getCDRMajorCausesPrevious", {
        "description": "",
        description: "getCDRMajorCausesPrevious",
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
};
