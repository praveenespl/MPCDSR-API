'use strict';
var async = require('async');
const {
    getCDRDeathAgeWiseDeath,
    getCDRDeathAndVerifiedCount,
    getCDRDeathForMapData
} = require("../utils/dashboardQueries");


module.exports = function (Cdrform1) {
    Cdrform1.getCDRDeathAgeWise = async function (params) {
        const self = this;

        const CdrForm1Aggregate = self.getDataSource().connector.collection(Cdrform1.modelName);
        try {
            const data = await getCDRDeathAgeWiseDeath(CdrForm1Aggregate, params)
            return data;
        } catch (e) {
            console.log(e);
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
            console.log(e);
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
            console.log(err);
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
    Cdrform1.getDashboardData = function (params, cb) {
        params.updatedAt.$gte = new Date(params.updatedAt.$gte);
        params.updatedAt.$lte = new Date(params.updatedAt.$lte);
        var self = this;
        var Cdrform1Collection = self.getDataSource().connector.collection(Cdrform1.modelName);
        let cursor = Cdrform1Collection.aggregate(

            // Pipeline
            [
                // Stage 1
                {
                    $match: params
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
                        },
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
                    }
                },

                // Stage 8
                {
                    $group: {
                        _id: {},
                        totDeath: {
                            $sum: 1
                        },
                        form2: {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form2", 0]
                                }, 1, 0]
                            }
                        },
                        form3A: {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form3A", 0]
                                }, 1, 0]
                            }
                        },
                        form3B: {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form3B", 0]
                                }, 1, 0]
                            }
                        },
                        form3C: {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form3C", 0]
                                }, 1, 0]
                            }
                        },
                        form4A: {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form4A", 0]
                                }, 1, 0]
                            }
                        },
                        form4B: {
                            $sum: {
                                $cond: [{
                                    $ne: ["$form4B", 0]
                                }, 1, 0]
                            }
                        }
                    }
                }
            ]
        );
        cursor.get(function (err, data) {
            if (err) return cb(err);
            return cb(false, data);
        });
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

    Cdrform1.getDeathsWhereCbmdsrAndFbmdsrConducted = function (params, cb) {
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
            }
            where['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
            project = {
                _id: 0,
                statecode: "$_id.statecode",
                whereCBMDSRConducted: 1,
                whereFBMDSRConducted: 1
            }
        } else if (params.accessUpto == "State") {
            masterAPIArg['type'] = "getDistricts";
            masterAPIArg['statecode'] = params.where['statecode'];
            where['statecode'] = params.where['statecode'];
            where['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
            groupUnderscoreId = {
                statecode: "$statecode",
                districtcode: "$districtcode",
            }
            project = {
                _id: 0,
                statecode: "$_id.statecode",
                districtcode: "$_id.districtcode",
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
            }
            project = {
                _id: 0,
                subdistrictcode: "$_id.subdistrictcode",
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
        //console.log('where',where);
        //console.log('groupUnderscoreId',groupUnderscoreId);
        //console.log('project',project);
        async.parallel({
            master: (callback) => {
                Cdrform1.app.models.Ihipaccess.getIhipAccessToken({
                    accesstype: "new",
                    oldAccessToken: ""
                }, (err, res) => {
                    let obj = {
                        accessToken: res.ihipAccessToken
                    }
                    Cdrform1.app.models.Ihipaccess.getIhipData({ accessToken: res.ihipAccessToken }, masterAPIArg, (err, ihipData) => {
                        callback(null, ihipData);
                    })
                })
            },
            whereCBMDSRAndFBMDSRConducted: function (callback) {
                let cursor = Cdrform1Collection.aggregate(
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
                                                        "$eq": [
                                                            "$palce_of_death",
                                                            "Hospital"
                                                        ]
                                                    }
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
                );
                cursor.get(function (err, data) {
                    callback(null, data);
                });
            }
        },
            function (err, results) {
                let data = [];
                results.master.forEach((item, i) => {
                    let obj = {};
                    if (params.accessUpto == "National") {
                        const foundState = results.whereCBMDSRAndFBMDSRConducted.find(state => state.statecode === item.statecode);
                        obj = {
                            "category": item.statename,
                            "statecode": item.statecode,
                            "column-1": foundState ? foundState.whereFBMDSRConducted : 0,
                            "column-2": foundState ? foundState.whereCBMDSRConducted : 0
                        }
                    } else if (params.accessUpto == "State") {
                        const foundDistrict = results.whereCBMDSRAndFBMDSRConducted.find(district => district.districtcode === item.districtcode);
                        obj = {
                            "category": item.districtname,
                            "districtcode": item.districtcode,
                            //"statename":item.statename,
                            "column-1": foundDistrict ? foundDistrict.whereFBMDSRConducted : 0,
                            "column-2": foundDistrict ? foundDistrict.whereCBMDSRConducted : 0
                        }
                    } else if (params.accessUpto == "District") {
                        const foundSubDistrict = results.whereCBMDSRAndFBMDSRConducted.find(subdistrict => subdistrict.subdistrictcode === item.subdistrictcode);
                        obj = {
                            "category": item.subdistrictname,
                            "subdistrictcode": item.subdistrictcode,
                            "column-1": foundSubDistrict ? foundSubDistrict.whereFBMDSRConducted : 0,
                            "column-2": foundSubDistrict ? foundSubDistrict.whereCBMDSRConducted : 0
                        }
                    }
                    data.push(obj);
                });
                if (params.accessUpto == "Block") {
                    obj = {
                        "category": results.whereCBMDSRAndFBMDSRConducted.subdistrictname,
                        "column-1": results.whereCBMDSRAndFBMDSRConducted ? results.whereCBMDSRAndFBMDSRConducted.whereFBMDSRConducted : 0,
                        "column-2": results.whereCBMDSRAndFBMDSRConducted ? results.whereCBMDSRAndFBMDSRConducted.whereCBMDSRConducted : 0
                    }
                    data.push(obj);
                }
                return cb(false, data)
            });
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

    Cdrform1.getNotificationDetails = function (params, cb) {
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
        );
        cursor.get(function (err, data) {
            if (err) return cb(err);
            return cb(false, data);
        });
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


    Cdrform1.getSubmittedFormsStatus = function (params, cb) {
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
        where1["palce_of_death"] = { $in: ['Home', 'In transit', 'Other'] }
        where1['updatedAt'] = { '$gte': new Date(params.previousYearFromDate), '$lte': new Date(params.previousYearToDate) };
        where2["palce_of_death"] = { $in: ['Hospital'] }
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
        async.parallel({
            cbmdsrFormsStatus: function (callback) {
                let cursor = Cdrform1Collection.aggregate(
                    // Pipeline
                    // Pipeline
                    [
                        // Stage 1
                        {
                            $match: where1
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
                );
                cursor.get(function (err, data) {
                    callback(null, data);
                });
            },
            fbmdsrFormsStatus: function (callback) {
                let cursor = Cdrform1Collection.aggregate(
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
                                "form4A": { $sum: "$form4A" },
                                "form4B": { $sum: "$form4B" },
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
                );
                cursor.get(function (err, data) {
                    callback(null, data);
                });
            }
        },
            function (err, results) {
                return cb(false, results)
            });
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
};


