'use strict';

module.exports = function(Stillbirth) {

Stillbirth.getNotificationCount = function (params, cb) {
        var self = this;
        var StillbirthCollection = self.getDataSource().connector.collection(Stillbirth.modelName);
        params.updatedAt.$gte = new Date(params.updatedAt.$gte);
        params.updatedAt.$lte = new Date(params.updatedAt.$lte);
        let cursor = StillbirthCollection.aggregate(
            // Pipeline
            [
                // Stage 1
                {
                    $match: params
                },
                // Stage 3
                {
                    $group: {
                        "_id": {},
                        "totalEntry": {
                            "$sum": 1
                        },
                        "Verified": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$verified",
                                                    true
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "Rejected": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$rejected",
                                                    true
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "birthDefect": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$details_of_still_birth.birthDefect",
                                                    "Yes"
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "consanguineous_marriage_yes": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$basic_information.consanguineous_marriage",
                                                    "Yes"
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "consanguineous_marriage_no": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$basic_information.consanguineous_marriage",
                                                    "No"
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "consanguineous_marriage_unknown": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$basic_information.consanguineous_marriage",
                                                    "Unknown"
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "gender_Male": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$examination.birth_details.sex_of_baby",
                                                    "Male"
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "gender_Female": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$examination.birth_details.sex_of_baby",
                                                    "Female"
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        "gender_Ambiguous": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$and": [
                                            {
                                                "$eq": [
                                                    "$examination.birth_details.sex_of_baby",
                                                    "Ambiguous"
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
                }

            ]
            // Created with 3T MongoChef, the GUI for MongoDB - http://3t.io/mongochef
        );
        cursor.get(function (err, data) {
            if (err) return cb(err);
            return cb(false, data);
        });
    }
    Stillbirth.remoteMethod("getNotificationCount", {
        description: "Get Notification vs Review Data",
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

};
