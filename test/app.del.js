
var express = require('../')
  , request = require('supertest');

// deprecated
// see: https://github.com/expressjs/express/commit/f31dcff10cce312a24e09fc233aa31fc0e2cc135

describe('app.delete()', function(){
  xit('should alias app.delete()', function(done){
    var app = express();

    app.del('/tobi', function(req, res){
      res.end('deleted tobi!');
    });

    request(app)
    .del('/tobi')
    .expect('deleted tobi!', done);
  })
})
