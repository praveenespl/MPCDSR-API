'use strict';

module.exports = function(Gis) {
  Gis.getStates = function(params, cb) {
    var self = this;
    let where = {
      type:"state"
    }
    if (params.stateNames) {
      where["name"] = {
        inq : params.stateNames
      }
    }
    Gis.find({
      where: where,
      limit: params.limit,
      skip: params.skip
    }, function(err, records) {
      if (err) {
        console.log(err);
        return cb(err);
      }
      let res = [];      
      let geo= {
        "type" : "FeatureCollection",
        "features": []
      };
      records.forEach(element => {
        geo.features.push({
          properties: {
            //"state": "state",
            //"stateName": element.stateName,
            //"statecode": element.statecode,
            //"code": 30,
            //"parentCode": 91,
            "name": element.name,
            //"area": 3647,
          },
          id: element.id,
          type: "Feature",
          geometry: element.geometry
        })

      });
      res.push(geo)
      return cb(null, res);
    });
  };


  Gis.getDistricts = function(params, cb) {
    var self = this;
    let where = {
      type: "district"
    };
    if (params.stateName) {
      where["stateName"] = params.stateName
    }

    Gis.find({
      where: where
    }, function(err, records) {
      if (err) {
        console.log(err);
        return cb(err);
      }
      let res = [];
      let geo = {
        "type": "FeatureCollection",
        "features": []
      };

      records.forEach(element => {
        geo.features.push({
          properties: {
            //"state": "state",
            "stateName": element.stateName,
            //"statecode": element.statecode,
            //"code": 30,
            //"parentCode": 91,
            "name": element.name,
            //"area": 3647,
          },
          id: element.id,
          type: "Feature",
          geometry: element.geometry
        })

      });
      res.push(geo)
      return cb(null, res);
    });

  };

  Gis.getSubDistricts = function(params, cb) {
    var self = this;
    let match = {
      type: 'subdistrict',
      stateName: {
        inq: params.states
      }
    };
    if (params.hasOwnProperty("districts")) {
      match.districtName = {
        inq: params.districts
      }
    }
    Gis.find({
      where: match
    }, function(err, records) {
      if (err) {
        console.log(err);
        return cb(err);
      }
      let res = [];
      let geo = {
        "type": "FeatureCollection",
        "features": []
      };


      records.forEach(element => {
        geo.features.push({
          properties: {
            //"state": "state",
            "stateName": element.stateName,
            //"statecode": element.statecode,
            "districtName": element.districtName,
            //"code": 30,
            //"parentCode": 91,
            "name": element.name,
            //"area": 3647,
          },
          id: element.id,
          type: "Feature",
          geometry: element.geometry
        })
      });
      res.push(geo)
      return cb(null, res);
    });

  };


  Gis.remoteMethod(
    'getStates', {
      description: 'Get the list of state names defined in the Giss data',
      accepts: {
        arg: 'params',
        type: 'object'
      },
      returns: {
        root: true,
        type: 'array'
      },
      http: {
        verb: 'get'
      }
    }
  );
  Gis.remoteMethod(
    'getDistricts', {
      description: 'Get the list of districts based on the comma separated list of names passed',
      accepts: {
        arg: 'params',
        type: 'object'
      },
      returns: {
        root: true,
        type: 'array'
      },
      http: {
        verb: 'get'
      }
    }
  );
  Gis.remoteMethod(
    'getSubDistricts', {
      description: 'Get the list of districts based on the comma separated list of names passed',
      accepts: [{
        arg: 'params',
        type: 'object'
      }],
      returns: {
        root: true,
        type: 'array'
      },
      http: {
        verb: 'get'
      }
    }
  );
};