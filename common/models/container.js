'use strict';
var ObjectId = require('mongodb').ObjectID;

module.exports = function (Container) {
  Container.afterRemote('upload', function (ctx, unused, next) {
    var self = this;
    let file = ctx.result.result.files.file[0];
    let fields = ctx.result.result.fields.fields[0];
    let FileLibrary = Container.app.models.FileLibrary;
    if (fields == 'multipleFiles') {
      let multiFilesArrayOfObj = [];
      ctx.result.result.files.file.forEach(element => {
        let fileUploadData = {
          container: element.container,
          modified_file_name: element.name,
          file_content_type: element.type,
          file_size: element.size,
          file_path: '/client/img',
          form_id: fields
        };
        multiFilesArrayOfObj.push(fileUploadData);
      });

      FileLibrary.create(multiFilesArrayOfObj, function (err, result) {
        if (err) {
          console.log(err)
        }
        ctx.result = result//returnResult
        next();
      });

    } else if (fields == 'mdsrdocs') {
      let fileUploadData = {
        container: file.container,
        modified_file_name: file.name,
        file_content_type: file.type,
        file_size: file.size,
        file_path: '/client/img/mdsrdocs',
        form_id: fields
      };

      FileLibrary.create(fileUploadData, function (err, result) {
        if (err) {
          console.log(err)
        }
        let returnResult = {
          container: result.container,
          modified_file_name: result.modified_file_name,
          file_content_type: result.file_content_type,
          file_size: result.file_size,
          file_path: '/client/img/mdsrdocs',
          file_id: result.id
        }
        ctx.result = returnResult;
        // ctx.result = result;
        next();
      });
    }
    else {
      let fileUploadData = {
        container: file.container,
        modified_file_name: file.name,
        file_content_type: file.type,
        file_size: file.size,
        file_path: '/client/img',
        form_id: fields
      };

      FileLibrary.create(fileUploadData, function (err, result) {
        if (err) {
          console.log(err)
        }
        let returnResult = {
          container: file.container,
          modified_file_name: file.name,
          original_file_name: file.originalFilename,
          file_content_type: file.type,
          file_size: file.size,
          file_path: '/client/img',
          file_id: result.id
        }
        ctx.result = returnResult
        next();
      });
    }
  });
};
