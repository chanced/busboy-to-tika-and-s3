/* jshint asi: true*/

var _ = require('lodash');
var request = require('request'); // used to hit the tika server
var Q = require('q'); // Promises, I went with Q because it's the easiest to get started with. Bluebird, server side at least, is a better library though and should be considered.
var ShortId = require('shortid').generate; // generates a very unique shortId https://github.com/dylang/shortid
var Busboy = require('busboy') // used to parse multi-part form data
var AWS = require('aws-sdk');
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g; //some lodash voodoo to use mustache style templating
var getKey = _.template('{{basepath}}/{{path}}/{{name}}'); //this is the template used to determine where the file goes.
var tika = process.env.TIKA_URL || 'http://localhost:9998/rmeta'
var bucket = process.env.AWS_BUCKET
var normalize = require('path').normalize
var es = require('event-stream');
var JSONStream = require('JSONStream')
var util = require('util')
var parseTika = JSONStream.parse('*') // '*' is a pattern matcher, see https://github.com/dominictarr/JSONStream for more info


// These need to be set in your ENV or loaded into a config.
// AWS_ACCESS_KEY_ID=
// AWS_SECRET_ACCESS_KEY
// AWS_BUCKET
// TIKA_URL


var parse = function(file){
  var q = Q.defer()
  var req = request({
    method: 'PUT',
    url: tika
  })

  var finish = es.mapSync(function (data) {
    return q.resolve(data)
  })
  file.pipe(req)
  .pipe(parseTika)
  .pipe(finish)
  return q.promise;
}


var upload = function(path, name, file){
  var q = Q.defer()
  var s3 = new AWS.S3();
  var key =  normalize(getKey({
    name: name,
    basepath: '/uploads',
    path: path
  }))
  var params = {
    Bucket: bucket || bucket,
    Body: file,
    Key: key
  };
  s3.upload(params, function(err, data) {
    return !err ?  q.resolve(data) : q.reject(err)
  });
  return q.promise;
}


module.exports = function(req, res, next) {
  var custom = _.get(req, 'body.custom') //this is an example using a custom field to influence the upload process. For example, a resource id could be provided
  var shortid = ShortId() //shortid is a tool used to create really small uid;
  var uploads = []
  var busboy = new Busboy({ headers: req.headers });

  var process = function(fieldname, file, filename, encoding, mimetype){
    var actions = [
      upload(custom || shortid, filename, file),
      parse(file)
    ]
    uploads.push(Q.spread(actions, function(upload, parse){
      var result = { s3: upload, tika: parse }
      return result
    }))
  }

  busboy.on('file', process)
  busboy.on('finish', function(){
    req.uploads = uploads
    next()
  })

  req.pipe(busboy);
}
