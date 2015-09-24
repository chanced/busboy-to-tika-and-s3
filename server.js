/* jshint asi: true*/
var express = require('express');
var app = express();
var path = require('path');
var fileHandler = require('./parse-upload')

app.post('/upload', fileHandler, function(req,res){
  res.send(req.uploads);
})


module.exports = app;
