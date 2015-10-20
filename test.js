/* jshint asi: true*/

var assert = require("assert");
var fs = require('fs')
var request = require('supertest')
var path = require('path')

describe('uploading files', function() {
  this.timeout(0);
  var server;
  beforeEach(function () {
    server = require('./server.js');
  });
  it('should upload and parse attached files', function (done) {
    request(server)
    .post('/upload')
    .attach('doc1', 'doc1.pdf')
    .expect(200)
    .expect(hasS3)
    .expect(hasTika)
    .end(done);

    function hasS3(res) {
      if (!('s3' in res.body)) return "missing s3 details";
    }
    function hasTika(res) {
      if (!('tiks' in res.body)) return "missing tika details";
    }

  });
});
