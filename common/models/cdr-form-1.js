'use strict';
const ObjectId = require('mongodb').ObjectId;
var async = require('async');
const {
    getCDRDeathAgeWiseDeath,
    getCDRDeathAndVerifiedCount,
    getCDRDeathForMapData
} = require("../utils/dashboardQueries");
var app = require('../../server/server');
const { ObjectID } = require('loopback-connector-mongodb');

module.exports = function (Cdrform1) {
    // Cdrform1.observe('after save', async function (ctx) {
    //     try {
    //       if (ctx.isNewInstance) {
    //         console.log(ctx.instance)
    //      const usermasterModel = app.models.usermaster;
    //         const data= await usermasterModel.find({_id:ctx.instance.createdBy})
    //         if (data){
    //             console.log(data)
    //         }
    //       }
    //       return;
    //     } catch (err) {
    //       console.log(err);
    //       return err;
    //     }
    //   });
    Cdrform1.getCDRDeathAgeWise = async function (params) {
        const self = this;

        const CdrForm1Aggregate = self.getDataSource().connector.collection(Cdrform1.modelName);
        try {
            const data = await getCDRDeathAgeWiseDeath(CdrForm1Aggregate, params)
            return data;
        } catch (e) {
            // console.log(e);
            return e;
        }
    }

    Cdrform1.remoteMethod('getCDRDeathAgeWise', {
        description: "Get All the death age group wise",
        accepts: [{
            arg: "params",
            type: "object",
            require: true,
            http: {
                "source": "body"
            }
        }],
        returns: {
            root: true,
            type: "array"
        },
        http: {
            verb: "post"
        }
    })


    /* Get CDR Death & Verified Death Based on filter*/
    /**
     * TODO - Filter to be created Dynamically
     */
    Cdrform1.getCDRDeathAndVerifiedCount = async function (params) {
        const self = this;
        const CdrForm1Aggregate = self.getDataSource().connector.collection(Cdrform1.modelName);
        try {
            const data = await getCDRDeathAndVerifiedCount(CdrForm1Aggregate, params);
            return data;
        } catch (error) {
            // console.log(e);
            return e;
        }
    }

    Cdrform1.remoteMethod('getCDRDeathAndVerifiedCount', {
        description: ' Get the CDR Death Count and Verified Death Count',
        accepts: [{
            arg: "params",
            type: "object",
            require: true,
            http: {
                "source": "body"
            }
        }],
        returns: {
            root: true,
            type: "array"
        },
        http: {
            verb: "post"
        }
    })

    // Getting Map Details - CDR Death Statewise, Districtwise, blockwise
    Cdrform1.getCDRDeathForMap = async function (params) {
        const self = this;

        const CdrForm1Aggregate = self.getDataSource().connector.collection(Cdrform1.modelName);
        try {
            const data = await getCDRDeathForMapData(Cdrform1, CdrForm1Aggregate, params);
            const finalResult = getDataForMap(data, params);
            return finalResult;
        } catch (err) {
            // console.log(err);
            return err;
        }
    }

    Cdrform1.remoteMethod('getCDRDeathForMap', {
        description: ' Get the CDR on Map',
        accepts: [{
            arg: "params",
            type: "object",
            require: true,
            http: {
                "source": "body"
            }
        }],
        returns: {
            root: true,
            type: "array"
        },
        http: {
            verb: "post"
        }
    })

    function getDataForMap(results, { params }) {
        let data = [];
        results.master.forEach((item, i) => {
            let obj = {};

            if (params.type === "getStates") {
                const foundState = results.actualReporting.find(state => state.statecode === item.statecode);
                obj = {
                    "statecode": item.statecode,
                    "state": item.statename,
                    "actual": foundState ? foundState.actual : 0
                }
            } else if (params.type === "getDistricts") {
                const foundDistrict = results.actualReporting.find((district) => district.districtcode == item.districtcode);
                obj = {
                    "districtcode": item.districtcode,
                    "district": item.districtname,
                    "statecode": foundDistrict ? foundDistrict.statecode : '',
                    "stateName": foundDistrict ? foundDistrict.state : '',
                    "actual": foundDistrict ? foundDistrict.actual : 0
                }
            }
            data.push(obj);

        });
        return data;
    }

    //Done by ravindra on 23-01-2021
    Cdrform1.getDashboardData = async function (params) {
        try {
            params.updatedAt.$gte = new Date(params.updatedAt.$gte);
            params.updatedAt.$lte = new Date(params.updatedAt.$lte);

            const self = this;

            const Cdrform1Collection = self.getDataSource().connector.collection(Cdrform1.modelName);
            let where;
            let type;
            if (params.accessupto === "National") {
                where = { updatedAt: { between: [params.updatedAt.$gte, params.updatedAt.$lte] } }
                type = {
                    "updatedAt": { "$gte": params.updatedAt.$gte, "$lte": params.updatedAt.$lte }, palce_of_death: {
                        '$in': [
                            'Home',
                            'In transit',
                            'Other',
                            'Others/Private',
                            'Health facility (Govt.)'
                        ]
                    },
                }
            } else if (params.accessupto === "State") {
                where = { statecode: params.statecode, updatedAt: { between: [params.updatedAt.$gte, params.updatedAt.$lte] } };
                type = {
                    "statecode": params.statecode, "updatedAt": { "$gte": params.updatedAt.$gte, "$lte": params.updatedAt.$lte }, palce_of_death: {
                        '$in': ['Home', 'In transit', 'Other', 'Others/Private', 'Health facility (Govt.)']
                    },
                }
            } else if (params.accessupto === "District") {
                where = { districtcode: params.districtcode, updatedAt: { between: [params.updatedAt.$gte, params.updatedAt.$lte] } };
                type = {
                    "districtcode": params.districtcode, "updatedAt": { "$gte": params.updatedAt.$gte, "$lte": params.updatedAt.$lte }, palce_of_death: {
                        '$in': ['Home', 'In transit', 'Other', 'Others/Private', 'Health facility (Govt.)']
                    },
                }
            }
            const data = await Cdrform1.find({ "where": where, "include": ["cdrForm2s", "cdrForm3s", "cdrForm3bs", "cdrForm3cs", "cdrForm4as", "cdrForm4bs"] })
            let form2 = 0;
            let form3A = 0;
            let form3B = 0;
            let form3C = 0;
            let form4A = 0;
            let form4B = 0;
            data.forEach(elem => {
                const check = JSON.stringify(elem);
                if (JSON.parse(check).cdrForm2s.length) {
                    form2 = form2 + 1
                }
                if (JSON.parse(check).cdrForm3s.length > 0) {
                    form3A = form3A + 1
                }
                if (JSON.parse(check).cdrForm3bs.length > 0) {
                    form3B = form3B + 1;
                }
                if (JSON.parse(check).cdrForm3cs.length > 0) {
                    form3C = form3C + 1;
                }
                if (JSON.parse(check).cdrForm4as.length > 0) {
                    form4A = form4A + 1;
                }
                if (JSON.parse(check).cdrForm4bs.length > 0) {
                    form4B = form4B + 1;
                }
            });
            const response = []
            response.push({
                "totDeath": data.length,
                "form2": form2,
                "form3A": form3A,
                "form3B": form3B,
                "form3C": form3C,
                "form4A": form4A,
                "form4B": form4B
            })
            let result
            result = await Cdrform1Collection.aggregate([
                {
                    $match: type
                },

                // Stage 1
                {
                    $lookup: {
                        "from": "cdr_form_2",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form2"
                    }
                },
                {
                    $project: {
                        form2: {
                            $cond: {
                                if: {
                                    $size: "$Form2"
                                },
                                then: {
                                    $size: "$Form2"
                                },
                                else: 0
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "_id",
                        totCBCDRDeath: {
                            $sum: 1
                        },
                        Form2: { $sum: "$form2" },
                    }
                }
            ]).toArray()
            if (result.length === 0) {
                result = [{ "_id": 0, "totCBCDRDeath": 0, "Form2": 0 }]
            } else {
                result
              
            }
            const all = [].concat(response, result);
            return (all);
        } catch (e) {
            //  console.log(e)
        }

    }
    Cdrform1.remoteMethod("getDashboardData", {
        description: "get dashboard Data",
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

    Cdrform1.getDeathsWhereCbmdsrAndFbmdsrConducted = async function (params) {
        let self = this;
        let Cdrform1Collection = self.getDataSource().connector.collection(Cdrform1.modelName);
        let masterAPIArg = {};
        let where = {};
        let groupUnderscoreId = {};
        let project = {};
        if (params.accessUpto == "National") {
            masterAPIArg['type'] = "getStates";
            groupUnderscoreId = {
                statecode: "$statecode",
                statename:"$address.statename"
            }
            where['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
            project = {
                _id: 0,
                statecode: "$_id.statecode",
                statename:"$_id.statename",
                whereCBMDSRConducted: 1,
                whereFBMDSRConducted: 1
            }
        } else if (params.accessUpto == "State") {
            masterAPIArg['type'] = "getDistricts";
            masterAPIArg['statecode'] = params.where['statecode'];
            where['statecode'] = params.where['statecode'];
            where['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
            groupUnderscoreId = {
                districtname: "$address.districtname",
                districtcode: "$districtcode",
            }
            project = {
                _id: 0,
                statecode: "$_id.statecode",
                districtcode: "$_id.districtcode",
                districtname: "$_id.districtname",
                whereCBMDSRConducted: 1,
                whereFBMDSRConducted: 1
            }
        } else if (params.accessUpto == "District") {
            masterAPIArg['type'] = "getSubDistricts";
            masterAPIArg['districtcode'] = params.where['districtcode'];
            where['districtcode'] = params.where['districtcode'];
            where['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
            groupUnderscoreId = {
                subdistrictcode: "$subdistrictcode",
                subdistrictname:"$address.subdistrictname"
            }
            project = {
                _id: 0,
                subdistrictcode: "$_id.subdistrictcode",
                subdistrictname:"$_id.subdistrictname",
                whereCBMDSRConducted: 1,
                whereFBMDSRConducted: 1
            }
        } else if (params.accessUpto == "Block") {
            where['block_id.subdistrictcode'] = params.where['subdistrictcode'];
            where['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
            groupUnderscoreId = {
                subdistrictcode: "$subdistrictcode",
            }
            project = {
                _id: 0,
                subdistrictcode: "$_id.subdistrictcode",
                whereCBMDSRConducted: 1,
                whereFBMDSRConducted: 1
            }
        }
        if (masterAPIArg.type == "getStates") {
            const stateModel = app.models.state;
            var master = await stateModel.find({});
        } else if (masterAPIArg.type == "getDistricts") {
            const districtModel = app.models.district;
            var master = await districtModel.find({ where: { stateCode: masterAPIArg.statecode } });

        } else if (masterAPIArg.type == "getSubDistricts") {
            const subdistrictModel = app.models.subdistrict;
            var master = await subdistrictModel.find({ where: { districtcode: masterAPIArg.districtcode } })

        } else if (masterAPIArg.type == "getVillages") {

            const villageModel = app.models.village;
            var master = await villageModel.find({ where: { subdistrictCode: masterAPIArg.subdistrictcode } })

        }

        let whereCBMDSRAndFBMDSRConducted = await Cdrform1Collection.aggregate(
            // Pipeline
            [
                {
                    $match: where
                },
                // Stage 1
                {
                    $group: {
                        _id: groupUnderscoreId,
                        "whereCBMDSRConducted": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$or": [
                                            {
                                                "$eq": [
                                                    "$palce_of_death",
                                                    "Home"
                                                ]
                                            },
                                            {
                                                "$eq": [
                                                    "$palce_of_death",
                                                    "In transit"
                                                ]
                                            },
                                            {
                                                "$eq": [
                                                    "$palce_of_death",
                                                    "Other"
                                                ]
                                            },
                                            {
                                                "$eq": [
                                                    "$palce_of_death",
                                                    "Others/Private"
                                                ]
                                            },
                                            {
                                                "$eq": [
                                                    "$palce_of_death",
                                                    "Health facility (Govt.)"
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "whereFBMDSRConducted": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$or": [
                                                    {
                                                        "$eq": [
                                                            "$palce_of_death",
                                                            "Hospital"
                                                        ]
                                                    },
                                                    {
                                                        "$eq": [
                                                            "$palce_of_death",
                                                            "Health facility"
                                                        ]
                                                    }
                                                ]
                                            },
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },

                // Stage 2
                {
                    $sort: {
                        whereCBMDSRConducted: -1,
                        whereFBMDSRConducted: -1
                    }
                },

                // Stage 3
                {
                    $project: project
                }

            ],
            // Options
            {
                cursor: {
                    batchSize: 50
                }
            }
        ).toArray()

        let data = [];
        whereCBMDSRAndFBMDSRConducted.forEach((item, i) => {
            let obj = {};
            if (params.accessUpto == "National") {
                // const foundState = whereCBMDSRAndFBMDSRConducted.find(state => state.statecode === item.statecode);
                obj = {
                    "category": item.statename,
                    "statecode": item.statecode,
                    "column-1": item ? item.whereFBMDSRConducted : 0,
                    "column-2": item ? item.whereCBMDSRConducted : 0
                }
            } else if (params.accessUpto == "State") {
                // const foundDistrict = whereCBMDSRAndFBMDSRConducted.find(district => district.districtcode === item.districtcode);
                obj = {
                    "category": item.districtname,
                    "districtcode": item.districtcode,
                    "districtname":item.statename,
                    "column-1": item ? item.whereFBMDSRConducted : 0,
                    "column-2": item ? item.whereCBMDSRConducted : 0
                }
            } else if (params.accessUpto == "District") {
                const foundSubDistrict = whereCBMDSRAndFBMDSRConducted.find(subdistrict => subdistrict.subdistrictcode === item.subdistrictcode);
                obj = {
                    "category": item.subdistrictname,
                    "subdistrictcode": item.subdistrictcode,
                    "column-1": item ? item.whereFBMDSRConducted : 0,
                    "column-2": item ? item.whereCBMDSRConducted : 0
                }
            }
            data.push(obj);
        });
        if (params.accessUpto == "Block") {
            obj = {
                "category": whereCBMDSRAndFBMDSRConducted.subdistrictname,
                "column-1": whereCBMDSRAndFBMDSRConducted ? results.whereCBMDSRAndFBMDSRConducted.whereFBMDSRConducted : 0,
                "column-2": whereCBMDSRAndFBMDSRConducted ? results.whereCBMDSRAndFBMDSRConducted.whereCBMDSRConducted : 0
            }
            data.push(obj);
        }

        return data;

    }
    Cdrform1.remoteMethod("getDeathsWhereCbmdsrAndFbmdsrConducted", {
        "description": "",
        description: "get getDeathsWhereCbmdsrAndFbmdsrConducted",
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

    Cdrform1.getNotificationDetails = async function (params) {
        var self = this;
        var Cdrform1Collection = self.getDataSource().connector.collection(Cdrform1.modelName);
        params.updatedAt.$gte = new Date(params.updatedAt.$gte);
        params.updatedAt.$lte = new Date(params.updatedAt.$lte);
        let cursor = Cdrform1Collection.aggregate(
            // Pipeline
            [
                // Stage 1
                {
                    $match: params
                }
            ]
            // Created with 3T MongoChef, the GUI for MongoDB - http://3t.io/mongochef
        ).toArray()

        return cursor;

    }
    Cdrform1.remoteMethod("getNotificationDetails", {
        description: "Get Notification Details",
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


    Cdrform1.getSubmittedFormsStatus = async function (params) {
        let self = this;
        let Cdrform1Collection = self.getDataSource().connector.collection(Cdrform1.modelName);
        let where1 = {};
        let where2 = {};
        let groupUnderscoreId = {};
        let project1CbCdr = {
            _id: 0,
            form2: {
                $cond: {
                    if: {
                        $size: "$Form2"
                    },
                    then: {
                        $size: "$Form2"
                    },
                    else: 0
                }
            },
            form3A: {
                $cond: {
                    if: {
                        $size: "$Form3A"
                    },
                    then: {
                        $size: "$Form3A"
                    },
                    else: 0
                }
            },
            form3B: {
                $cond: {
                    if: {
                        $size: "$Form3B"
                    },
                    then: {
                        $size: "$Form3B"
                    },
                    else: 0
                }
            },
            form3C: {
                $cond: {
                    if: {
                        $size: "$Form3C"
                    },
                    then: {
                        $size: "$Form3C"
                    },
                    else: 0
                }
            }
        };
        let project1FbCdr = {
            _id: 0,
            form4A: {
                $cond: {
                    if: {
                        $size: "$Form4A"
                    },
                    then: {
                        $size: "$Form4A"
                    },
                    else: 0
                }
            },
            form4B: {
                $cond: {
                    if: {
                        $size: "$Form4B"
                    },
                    then: {
                        $size: "$Form4B"
                    },
                    else: 0
                }
            }
        };
        let project2CbCdr = {
            _id: 0,
            form1: 1,
            form2: 1,
            form3A: 1,
            form3B: 1,
            form3C: 1
        };
        let project2FbCdr = {
            _id: 0,
            form1: 1,
            form4A: 1,
            form4B: 1,
        };
        let sort = {}
        where1["palce_of_death"] = { $in: ['Home', 'In transit', 'Other', 'Others/Private', 'Health facility (Govt.)'] }
        where1['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
        where2["palce_of_death"] = { $in: ['Hospital', 'Health facility'] }
        where2['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
        if (params.accessUpto == "National") {
            groupUnderscoreId = {
                statecode: "$statecode",
                statename: "$statename"
            }
            project1CbCdr['statename'] = "$address.statename";
            project1CbCdr['statecode'] = "$statecode";
            project2CbCdr['statename'] = "$_id.statename";
            project2CbCdr['statecode'] = "$_id.statecode";
            project1FbCdr['statename'] = "$address.statename";
            project1FbCdr['statecode'] = "$statecode";
            project2FbCdr['statename'] = "$_id.statename";
            project2FbCdr['statecode'] = "$_id.statecode";
            sort['statename'] = 1;
        } else if (params.accessUpto == "State") {
            where1['statecode'] = params.where['statecode'];
            where2['statecode'] = params.where['statecode'];
            groupUnderscoreId = {
                districtcode: "$districtcode",
                districtname: "$districtname"
            }
            project1CbCdr['districtname'] = "$address.districtname";
            project1CbCdr['districtcode'] = "$districtcode";
            project2CbCdr['districtname'] = "$_id.districtname";
            project2CbCdr['districtcode'] = "$_id.districtcode";
            project1FbCdr['districtname'] = "$address.districtname";
            project1FbCdr['districtcode'] = "$districtcode";
            project2FbCdr['districtname'] = "$_id.districtname";
            project2FbCdr['districtcode'] = "$_id.districtcode";
            sort['districtname'] = 1;
        } else if (params.accessUpto == "District") {
            where1['districtcode'] = params.where['districtcode'];
            where2['districtcode'] = params.where['districtcode'];
            groupUnderscoreId = {
                subdistrictcode: "$subdistrictcode",
                subdistrictname: "$subdistrictname"
            }
            project1CbCdr['subdistrictname'] = "$address.subdistrictname";
            project1CbCdr['subdistrictcode'] = "$subdistrictcode";
            project2CbCdr['subdistrictname'] = "$_id.subdistrictname";
            project2CbCdr['subdistrictcode'] = "$_id.subdistrictcode";
            project1FbCdr['subdistrictname'] = "$address.subdistrictname";
            project1FbCdr['subdistrictcode'] = "$subdistrictcode";
            project2FbCdr['subdistrictname'] = "$_id.subdistrictname";
            project2FbCdr['subdistrictcode'] = "$_id.subdistrictcode";
            sort['subdistrictname'] = 1;
        } else if (params.accessUpto == "Block") {
            where1['subdistrictcode'] = params.where['subdistrictcode'];
            where2['subdistrictcode'] = params.where['subdistrictcode'];
            groupUnderscoreId = {
                subdistrictcode: "$subdistrictcode",
                subdistrictname: "$address.subdistrictname"
            }
            project1['subdistrictname'] = "$address.subdistrictname";
            project1['subdistrictcode'] = "$subdistrictcode";
            project2['subdistrictname'] = "$_id.subdistrictname";
            project2['subdistrictcode'] = "$_id.subdistrictcode";
            sort['subdistrictname'] = 1;
        }
        // console.log('where1', where1);
        // console.log('where2', where2);
        // console.log('project1', project1);
        // console.log('project2', project2);
        // console.log('groupUnderscoreId', groupUnderscoreId);
        // console.log('sort', sort);

        let cbmdsrFormsStatus = await Cdrform1Collection.aggregate(
            // Pipeline
            // Pipeline
            [
                // Stage 1
                {
                    $match: where1
                },
                {
                    $lookup: {
                        "from": "cdr_form_2",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form2"
                    }
                },

                // Stage 2
                {
                    $lookup: {
                        "from": "cdr_form_3",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form3A"
                    }
                },

                // Stage 3
                {
                    $lookup: {
                        "from": "cdr_form_3b",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form3B"
                    }
                },

                // Stage 4
                {
                    $lookup: {
                        "from": "cdr_form_3c",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form3C"
                    }
                },



                // Stage 7
                {
                    $project: project1CbCdr
                },

                // Stage 8
                {
                    $group: {
                        _id: groupUnderscoreId,
                        "form1": { $sum: 1 },
                        "form2": { $sum: "$form2" },
                        "form3A": { $sum: "$form3A" },
                        "form3B": { $sum: "$form3B" },
                        "form3C": { $sum: "$form3C" }

                    }
                },

                // Stage 9
                {
                    $project: project2CbCdr
                },

                // Stage 10
                {
                    $sort: sort
                },

            ],
            // Options
            {
                cursor: {
                    batchSize: 50
                }
            }
        ).toArray()

        let fbmdsrFormsStatus = await Cdrform1Collection.aggregate(
            // Pipeline
            // Pipeline
            [
                // Stage 1
                {
                    $match: where2
                },

                // Stage 5
                {
                    $lookup: {
                        "from": "cdr_form_4a",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form4A"
                    }
                },

                // Stage 6
                {
                    $lookup: {
                        "from": "cdr_form_4b",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form4B"
                    }
                },

                // Stage 7
                {
                    $project: project1FbCdr
                },

                // Stage 8
                {
                    $group: {
                        _id: groupUnderscoreId,
                        "form1": { $sum: 1 },
                        "form4A": {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form4A", 0]
                                }, 1, 0]
                            }
                        },
                        "form4B": {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form4B", 0]
                                }, 1, 0]
                            }
                        },
                    }
                },

                // Stage 9
                {
                    $project: project2FbCdr
                },

                // Stage 10
                {
                    $sort: sort
                },

            ],
            // Options
            {
                cursor: {
                    batchSize: 50
                }
            }
        ).toArray()
        const results = { cbmdsrFormsStatus: cbmdsrFormsStatus, fbmdsrFormsStatus: fbmdsrFormsStatus }
        return results

    }

    Cdrform1.remoteMethod("getSubmittedFormsStatus", {
        "description": "",
        description: "getSubmittedFormsStatus",
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

    //End by ravindra


    Cdrform1.getCdrReportsDetails = async function (params) {
        try {
            if (params.statecode > 0) {
                var dmatch = {
                    statecode: params.statecode,
                    updatedAt: {
                        $gte: new Date(params.fromDate), $lte: new Date(params.toDate)
                    }
                }
            }else if (params.districtcode > 0) {
                var dmatch = {
                    districtcode: params.districtcode,
                    updatedAt: {
                        $gte: new Date(params.fromDate), $lte: new Date(params.toDate)
                    }
                }
            }else if (params.createdBy.length > 0) {
                var dmatch = {
                    createdBy: ObjectID(params.createdBy),
                    updatedAt: {
                        $gte: new Date(params.fromDate), $lte: new Date(params.toDate)
                    }
                }
            }
        
            const self = this;
            const Cdrform1Collection = self.getDataSource().connector.collection(Cdrform1.modelName);
            const res = await Cdrform1Collection.aggregate([
                {
                    $match: dmatch
                },
                {
                    $lookup: {
                        "from": "cdr_form_2",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form2"
                    }
                },
                {
                    $unwind: {
                        "path": "$Form2",
                        "includeArrayIndex": "0",
                        "preserveNullAndEmptyArrays": true
                    }
                },

                {
                    $lookup: {
                        "from": "cdr_form_4a",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "form4a"
                    }
                },
                {
                    $unwind: {
                        "path": "$form4a",
                        "includeArrayIndex": "0",
                        "preserveNullAndEmptyArrays": true
                    }
                },

                {
                    $lookup: {
                        "from": "cdr_form_4b",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "form4b"
                    }
                },
                {
                    $unwind: {
                        "path": "$form4b",
                        "includeArrayIndex": "0",
                        "preserveNullAndEmptyArrays": true
                    }
                },

                {
                    $project: {
                        statecode: "$statecode",
                        districtcode: "$districtcode",
                        subdistrictcode: "$subdistrictcode",
                        statename: "$address.statename",
                        districtname: "$address.districtname",
                        subdistrictname: "$address.subdistrictname",
                        total: { $sum: 1 },
                        days: { $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] },
                        lessThanMonth: { "$cond": [{ "$lte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 28] }, 1, 0] },
                        lessThanYear: { "$cond": [{ "$and": [{ "$gte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 29] }, { "$lte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 365] }] }, 1, 0] },
                        lessThanFiveYear: { "$cond": [{ "$and": [{ "$gte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 366] }, { "$lte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 1825] }] }, 1, 0] },
                        male: { $cond: [{ $eq: ["$sex", "Male"] }, 1, 0] },
                        ambiguous: { $cond: [{ $eq: ["$sex", "Ambiguous"] }, 1, 0] },
                        female: { $cond: [{ $eq: ["$sex", "Female"] }, 1, 0] },
                        home: { $cond: [{ $eq: ["$palce_of_death", "Home"] }, 1, 0] },
                        hospital: { $cond: [{ $eq: ["$palce_of_death", "Hospital"] }, 1, 0] },
                        healthFacility: { $cond: [{ $eq: ["$palce_of_death", "Health facility"] }, 1, 0] },
                        inTransit: { $cond: [{ $eq: ["$palce_of_death", "In transit"] }, 1, 0] },
                        general: { $cond: [{ $eq: ["$Form2.sectionA.belongs_to", "General"] }, 1, 0] },
                        generalone: { $cond: [{ $eq: ["$form4a.sectionA.category", "General"] }, 1, 0] },
                        generaltwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "General"] }, 1, 0] },
                        sc: { $cond: [{ $eq: ["$Form2.sectionA.category", "SC"] }, 1, 0] },
                        scone: { $cond: [{ $eq: ["$form4a.sectionA.category", "SC"] }, 1, 0] },
                        sctwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "SC"] }, 1, 0] },
                        st: { $cond: [{ $eq: ["$Form2.sectionA.belongs_to", "ST"] }, 1, 0] },
                        stone: { $cond: [{ $eq: ["$form4a.sectionA.category", "ST"] }, 1, 0] },
                        sttwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "ST"] }, 1, 0] },
                        obc: { $cond: [{ $eq: ["$Form2.sectionA.belongs_to", "OBC"] }, 1, 0] },
                        obcone: { $cond: [{ $eq: ["$form4a.sectionA.category", "OBC"] }, 1, 0] },
                        obctwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "OBC"] }, 1, 0] },
                        na: { $cond: [{ $eq: ["$Form2.sectionA.belongs_to", "NA"] }, 1, 0] },
                        naOne: { $cond: [{ $eq: ["$form4a.sectionA.category", "Na"] }, 1, 0] },
                        naTwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "NA"] }, 1, 0] }
                    }
                },
                // {
                //     $group: {
                //         _id: "$subdistrictcode",
                //         statecode: { "$first": "$statecode" },
                //         districtcode: { "$first": "$districtcode" },
                //         statename: { "$first": "$statename" },
                //         districtname: { "$first": "$districtname" },
                //         subdsitrictname: { "$first": "$subdistrictname" },
                //         days: { "$first": "$days" },
                //         lessThanMonth: { "$sum": "$lessThanMonth" },
                //         lessThanYear: { "$sum": "$lessThanYear" },
                //         lessThanFiveYear: { "$sum": "$lessThanFiveYear" },
                //         male: { $sum: "$male" },
                //         female: { $sum: "$female" },
                //         ambiguous:{ $sum:"$ambiguous"},
                //         home: { $sum: "$home" },
                //         hospital: { $sum: { $add: ["$hospital", "$healthFacility"] } },
                //         inTransit: { $sum: "$inTransit" },
                //         general: { $sum: { $add: ["$general", "$generalone", "$generaltwo"] } },
                //         sc: { $sum: { $add: ["$sc", "$scone", "$sctwo"] } },
                //         st: { $sum: { $add: ["$st", "$stone", "$sttwo"] } },
                //         obc: { $sum: { $add: ["$obc", "$obcone", "$obctwo"] } },
                //         na: { $sum: { $add: ["$na", "$naOne", "$naTwo"] } },
                //         total: { $sum: 1 },
                //     }
                // }

            ]).toArray();

            var seenNames = {};

            const array = res.filter(function (currentObject) {
                if (currentObject._id in seenNames) {
                    return false;
                } else {
                    seenNames[currentObject._id] = true;
                    return true;
                }
            });
            var result = [];
            array.reduce(function (res, value) {
                if (!res[value.subdistrictcode]) {
                    res[value.subdistrictcode] = { _id: value._id, ambiguous: 0, total: 0, subdistrictcode: 0, statename: 0, districtname: 0, subdistrictname: 0, districtcode: 0, female: 0, general: 0, generalone: 0, generaltwo: 0, healthFacility: 0, home: 0, hospital: 0, inTransit: 0, lessThanFiveYear: 0, lessThanMonth: 0, lessThanYear: 0, male: 0, na: 0, naOne: 0, naTwo: 0, obc: 0, obcone: 0, obctwo: 0, sc: 0, scone: 0, sctwo: 0, st: 0, stone: 0, sttwo: 0 };
                    result.push(res[value.subdistrictcode])
                }
                res[value.subdistrictcode].statename = value.statename;
                res[value.subdistrictcode].districtname = value.districtname;
                res[value.subdistrictcode].subdistrictname = value.subdistrictname;
                res[value.subdistrictcode].male += value.male;
                res[value.subdistrictcode].ambiguous += value.ambiguous;
                res[value.subdistrictcode].female += value.female;
                res[value.subdistrictcode].total += value.total;
                res[value.subdistrictcode].general += value.general;
                res[value.subdistrictcode].generalone += value.generalone;
                res[value.subdistrictcode].generaltwo += value.generaltwo;
                res[value.subdistrictcode].healthFacility += value.healthFacility;
                res[value.subdistrictcode].home += value.home;
                res[value.subdistrictcode].hospital += value.hospital;
                res[value.subdistrictcode].inTransit += value.inTransit;
                res[value.subdistrictcode].lessThanFiveYear += value.lessThanFiveYear;
                res[value.subdistrictcode].lessThanMonth += value.lessThanMonth;
                res[value.subdistrictcode].lessThanYear += value.lessThanYear;
                res[value.subdistrictcode].na += value.na;
                res[value.subdistrictcode].naOne += value.naOne;
                res[value.subdistrictcode].naTwo += value.naTwo;
                res[value.subdistrictcode].obc += value.obc;
                res[value.subdistrictcode].obcone += value.obcone;
                res[value.subdistrictcode].obctwo += value.obctwo;
                res[value.subdistrictcode].sc += value.sc;
                res[value.subdistrictcode].scone += value.scone;
                res[value.subdistrictcode].sctwo += value.sctwo;
                res[value.subdistrictcode].st += value.st;
                res[value.subdistrictcode].stone += value.stone;
                res[value.subdistrictcode].sttwo += value.sttwo;
                return res;
            }, {});
            return result;
        } catch (e) {
            //  console.log(e)
        }
    }
    Cdrform1.remoteMethod("getCdrReportsDetails", {
        "description": "",
        description: "getCdrReportsDetails",
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

    Cdrform1.getFormStatusReport = async function (params) {
        try {
            if (params.statecode > 0) {
                var dmatch = {
                    statecode: params.statecode,
                    updatedAt: {
                        $gte: new Date(params.fromDate), $lte: new Date(params.toDate)
                    }
                }
            }else if (params.districtcode > 0) {
                var dmatch = {
                    districtcode: params.districtcode,
                    updatedAt: {
                        $gte: new Date(params.fromDate), $lte: new Date(params.toDate)
                    }
                }
            }else if (params.subdistrictcode > 0) {
                var dmatch = {
                    subdistrictcode: params.subdistrictcode,
                    updatedAt: {
                        $gte: new Date(params.fromDate), $lte: new Date(params.toDate)
                    }
                }
            } else if (params.createdBy.length > 0) {
                var dmatch = {
                    createdBy: ObjectID(params.createdBy),
                    updatedAt: {
                        $gte: new Date(params.fromDate), $lte: new Date(params.toDate)
                    }
                }
            }

            const self = this;
            const Cdrform1Collection = self.getDataSource().connector.collection(Cdrform1.modelName);
            const result = await Cdrform1Collection.aggregate([
                { $match: dmatch },
                {
                    $lookup: {
                        "from": "cdr_form_2",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "Form2"
                    }
                },
                {
                    $lookup: {
                        "from": "cdr_form_3",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "form3a"
                    }
                },
                {
                    $lookup: {
                        "from": "cdr_form_3b",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "form3b"
                    }
                },
                {
                    $lookup: {
                        "from": "cdr_form_3c",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "form3c"
                    }
                },
                {
                    $lookup: {
                        "from": "cdr_form_4a",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "form4a"
                    }
                },
                {
                    $lookup: {
                        "from": "cdr_form_4b",
                        "localField": "_id",
                        "foreignField": "cdr_id",
                        "as": "form4b"
                    }
                },
                {
                    $project: {
                        statecode: "$statecode",
                        districtcode: "$districtcode",
                        subdistrictcode: "$subdistrictcode",
                        statename: "$address.statename",
                        dateofdeath: "$date_of_death",
                        districtname: "$address.districtname",
                        subdistrictname: "$address.subdistrictname",
                        form1fb: { $cond: [{ $eq: ["$palce_of_death", "Hospital"] }, 1, 0] },
                        form1fbcd: { $cond: [{ $eq: ["$palce_of_death", "Health facility"] }, 1, 0] },
                        form1cbcd: { $cond: [{ $eq: ["$palce_of_death", "In transit"] }, 1, 0] },
                        form1cbcdr: { $cond: [{ $eq: ["$palce_of_death", "Home"] }, 1, 0] },
                        form1cbcr: { $cond: [{ $eq: ["$palce_of_death", "Other"] }, 1, 0] },
                        form1cbr: { $cond: [{ $eq: ["$palce_of_death", "Others/Private"] }, 1, 0] },
                        form1cb: { $cond: [{ $eq: ["$palce_of_death", "Health facility (Govt.)"] }, 1, 0] },
                        form2: { $cond: { if: { $size: "$Form2" }, then: 1, else: 0 } },
                        form3a: { $cond: { if: { $size: "$form3a" }, then: 1, else: 0 } },
                        form3b: { $cond: { if: { $size: "$form3b" }, then: 1, else: 0 } },
                        form3c: { $cond: { if: { $size: "$form3c" }, then: 1, else: 0 } },
                        form4a: { $cond: { if: { $size: "$form4a" }, then: 1, else: 0 } },
                        form4b: { $cond: { if: { $size: "$form4b" }, then: 1, else: 0 } },
                    }

                },
                {
                    $group: {
                        _id: "$subdistrictcode",
                        statecode: { "$first": "$statecode" },
                        districtcode: { "$first": "$districtcode" },
                        statename: { "$first": "$statename" },
                        districtname: { "$first": "$districtname" },
                        subdsitrictname: { "$first": "$subdistrictname" },
                        total: { $sum: 1 },
                        form1fbcdsr: { $sum: { $add: ["$form1fb", "$form1fbcd"] } },
                        form1cbcdsr: { $sum: { $add: ["$form1cbcd", "$form1cbcdr", "$form1cbcr", "$form1cbr", "$form1cb"] } },
                        form2: { $sum: "$form2" },
                        form3a: { $sum: "$form3a" },
                        form3b: { $sum: "$form3b" },
                        form3c: { $sum: "$form3c" },
                        form4a: {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form4a", 0]
                                }, 1, 0]
                            }
                        },
                        form4b: {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form4b", 0]
                                }, 1, 0]
                            }
                        },
                    }
                }

            ]).toArray();

            return (result);
        } catch (e) {
            //  console.log(e)
        }


    }
    Cdrform1.remoteMethod("getFormStatusReport", {
        "description": "",
        description: "getFormStatusReport",
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
    Cdrform1.goiReport = async function (params) {
        const { fromDate, toDate, accessUpto, districtcodes, statecodes, subdistrictcodes,createdBy } = params;

        const where = {
            updatedAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
        }

        if (statecodes.length > 0 && districtcodes.length === 0 && subdistrictcodes.length === 0) {
            where["statecode"] = { $in: statecodes };
            // console.log("state")
            var groupId = "$districtcode"
        } else if (districtcodes.length > 0 && statecodes.length > 0 && subdistrictcodes.length === 0) {
            where["statecode"] = { $in: statecodes };
            where["districtcode"] = { $in: districtcodes };
            // console.log("district")
            var groupId = "$subdistrictcode"
        } else if (subdistrictcodes.length > 0 && statecodes.length > 0 && districtcodes.length > 0) {
            where["statecode"] = { $in: statecodes };
            // console.log("subdistrict")
            where["districtcode"] = { $in: districtcodes };
            where["subdistrictcode"] = { $in: subdistrictcodes };
            where["createdBy"] = ObjectId(createdBy);
            var groupId = "$subdistrictcode"
        } else {
            var groupId = "$statecode"
        }

        const self = this;
        const Cdrform1Collection = self.getDataSource().connector.collection(Cdrform1.modelName);
          console.log("--->",where)
          console.log("-------->",groupId)
        const res = await Cdrform1Collection.aggregate([
            {
                $match: where
            },
            {
                $lookup: {
                    "from": "cdr_form_2",
                    "localField": "_id",
                    "foreignField": "cdr_id",
                    "as": "Form2"
                }
            },
            {
                $unwind: {
                    "path": "$Form2",
                    "includeArrayIndex": "0",
                    "preserveNullAndEmptyArrays": true
                }
            },

            {
                $lookup: {
                    "from": "cdr_form_4a",
                    "localField": "_id",
                    "foreignField": "cdr_id",
                    "as": "form4a"
                }
            },
            {
                $unwind: {
                    "path": "$form4a",
                    "includeArrayIndex": "0",
                    "preserveNullAndEmptyArrays": true
                }
            },

            {
                $lookup: {
                    "from": "cdr_form_4b",
                    "localField": "_id",
                    "foreignField": "cdr_id",
                    "as": "form4b"
                }
            },
            {
                $unwind: {
                    "path": "$form4b",
                    "includeArrayIndex": "0",
                    "preserveNullAndEmptyArrays": true
                }
            },

            {
                $project: {
                    statecode: "$statecode",
                    districtcode: "$districtcode",
                    subdistrictcode: "$subdistrictcode",
                    statename: "$address.statename",
                    districtname: "$address.districtname",
                    subdistrictname: "$address.subdistrictname",
                    total: { $sum: 1 },
                    days: { $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] },
                    lessThanMonth: { "$cond": [{ "$lte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 28] }, 1, 0] },
                    lessThanYear: { "$cond": [{ "$and": [{ "$gte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 29] }, { "$lte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 365] }] }, 1, 0] },
                    lessThanFiveYear: { "$cond": [{ "$and": [{ "$gte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 366] }, { "$lte": [{ $divide: [{ $subtract: ["$date_of_death", "$date_of_birth"] }, 86400000] }, 1825] }] }, 1, 0] },
                    male: { $cond: [{ $eq: ["$sex", "Male"] }, 1, 0] },
                    ambiguous: { $cond: [{ $eq: ["$sex", "Ambiguous"] }, 1, 0] },
                    female: { $cond: [{ $eq: ["$sex", "Female"] }, 1, 0] },
                    home: { $cond: [{ $eq: ["$palce_of_death", "Home"] }, 1, 0] },
                    hospital: { $cond: [{ $eq: ["$palce_of_death", "Hospital"] }, 1, 0] },
                    healthFacilityGovt: { $cond: [{ $eq: ["$palce_of_death", "Health facility (Govt.)"] }, 1, 0] },
                    healthFacilityPvt: { $cond: [{ $eq: ["$palce_of_death", "Others/Private"] }, 1, 0] },
                    healthFacility: { $cond: [{ $eq: ["$palce_of_death", "Health facility"] }, 1, 0] },
                    inTransit: { $cond: [{ $eq: ["$palce_of_death", "In transit"] }, 1, 0] },
                    delayAtHome: { $cond: [{ $eq: ["$Form2.sectionD.delay_at_home", true] }, 1, 0] },
                    delayInTransportation: { $cond: [{ $eq: ["$Form2.sectionD.delay_in_transportation", true] }, 1, 0] },
                    delayAtFacility: { $cond: [{ $eq: ["$Form2.sectionD.delay_at_facility", true] }, 1, 0] },
                    general: { $cond: [{ $eq: ["$Form2.sectionA.belongs_to", "General"] }, 1, 0] },
                    generalone: { $cond: [{ $eq: ["$form4a.sectionA.category", "General"] }, 1, 0] },
                    generaltwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "General"] }, 1, 0] },
                    sc: { $cond: [{ $eq: ["$Form2.sectionA.category", "SC"] }, 1, 0] },
                    scone: { $cond: [{ $eq: ["$form4a.sectionA.category", "SC"] }, 1, 0] },
                    sctwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "SC"] }, 1, 0] },
                    st: { $cond: [{ $eq: ["$Form2.sectionA.belongs_to", "ST"] }, 1, 0] },
                    stone: { $cond: [{ $eq: ["$form4a.sectionA.category", "ST"] }, 1, 0] },
                    sttwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "ST"] }, 1, 0] },
                    obc: { $cond: [{ $eq: ["$Form2.sectionA.belongs_to", "OBC"] }, 1, 0] },
                    obcone: { $cond: [{ $eq: ["$form4a.sectionA.category", "OBC"] }, 1, 0] },
                    obctwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "OBC"] }, 1, 0] },
                    na: { $cond: [{ $eq: ["$Form2.sectionA.belongs_to", "NA"] }, 1, 0] },
                    naOne: { $cond: [{ $eq: ["$form4a.sectionA.category", "Na"] }, 1, 0] },
                    naTwo: { $cond: [{ $eq: ["$form4b.sectionA.category", "NA"] }, 1, 0] }
                }
            },
            {
                $group: {
                    _id: groupId,
                    statecode: { "$first": "$statecode" },
                    districtcode: { "$first": "$districtcode" },
                    statename: { "$first": "$statename" },
                    districtname: { "$first": "$districtname" },
                    subdistrictname: { "$first": "$subdistrictname" },
                    days: { $sum: "$days" },
                    lessThanMonth: { $sum: "$lessThanMonth" },
                    lessThanYear: { $sum: "$lessThanYear" },
                    lessThanFiveYear: { $sum: "$lessThanFiveYear" },
                    male: { $sum: "$male" },
                    female: { $sum: "$female" },
                    ambiguous: { $sum: "$ambiguous" },
                    delayAtHome: { $sum: "$delayAtHome" },
                    delayAtFacility: { $sum: "$delayAtFacility" },
                    delayInTransportation: { $sum: "$delayInTransportation" },
                    home: { $sum: "$home" },
                    healthFacilityGovt: { $sum: { $add: ["$hospital", "$healthFacilityGovt"] } },
                    healthFacilityPvt: { $sum: { $add: ["$healthFacilityPvt", "$healthFacility"] } },
                    inTransit: { $sum: "$inTransit" },
                    general: { $sum: { $add: ["$general", "$generalone", "$generaltwo"] } },
                    sc: { $sum: { $add: ["$sc", "$scone", "$sctwo"] } },
                    st: { $sum: { $add: ["$st", "$stone", "$sttwo"] } },
                    obc: { $sum: { $add: ["$obc", "$obcone", "$obctwo"] } },
                    na: { $sum: { $add: ["$na", "$naOne", "$naTwo"] } },
                    total: { $sum: 1 },
                }
            }

        ]).toArray();
        return res;
    }
    Cdrform1.remoteMethod("goiReport", {
        "description": "",
        description: "goiReport",
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


