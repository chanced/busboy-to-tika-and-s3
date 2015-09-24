/* jshint asi: true*/
var server = require('./index')

server.listen(9000, function () {
  console.log('Connected on', server.address().port);
});
