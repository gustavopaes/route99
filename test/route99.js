var assert = require('assert');
var expect = require('chai').expect;
var request = require('request');


var Route99 = require('../src/route99');
var app = new Route99();

describe('Creating server', function() {
  it('should return 404 NotFound on request http://127.0.0.1:9991/', function(done) {
    app.listen({
      port: 9991
    });

    request.get('http://127.0.0.1:9991/', function(err, res, body) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(404);
      expect(res.body).to.equal(JSON.stringify({"error":true,"message":"404 Not Found"}));
      done();
    });
  });

  it('should return X-Powered-By header response on request http://127.0.0.1:9991/', function(done) {
    app.use(function(req, res, next) {
      res.setHeader('X-Powered-By', 'route99');
      next();
    });

    request.get('http://127.0.0.1:9991/client', function(err, res, body){
      expect(err).to.equal(null);
      expect(res.headers['x-powered-by']).to.equal('route99');

      done();
    });
  });

  it('should return personalised 404 NotFound on request http://127.0.0.1:9991/notFound', function(done) {
    app.notFound(function(req, res) {
      res.send(404, 'My NotFound');
    });

    request.get('http://127.0.0.1:9991/notFound', function(err, res, body) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(404);
      expect(res.body).to.equal('My NotFound');
      done();
    });
  });
});

describe('API: register', function() {
  app.register('route1', function(routeApp) {
    routeApp.get('/', function(req, res) {
      res.send({
        route: 'route1',
        path: '/'
      });
    });

    routeApp.get('/sub1', function(req, res) {
      res.send({
        route: 'route1',
        path: '/sub1'
      });
    });
  });

  it('should return 200 OK on request http://127.0.0.1:9991/route1', function(done) {
    request.get('http://127.0.0.1:9991/route1', function(err, res, body) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal(JSON.stringify({
        route: 'route1',
        path: '/'
      }));

      done();
    });
  });

  it('should return 200 OK on request http://127.0.0.1:9991/route1/sub1', function(done) {
    request.get('http://127.0.0.1:9991/route1/sub1', function(err, res, body) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal(JSON.stringify({
        route: 'route1',
        path: '/sub1'
      }));

      done();
    });
  });
});

describe('API: expose', function() {
  app.register('route2', function(routeApp) {
    routeApp.expose('foo', 'bar');

    routeApp.get('/myExpose', function(req, res) {
      res.send(routeApp.env.foo);

      // change for next test
      routeApp.expose('foo', 'many bars');
    });

    routeApp.get('/myNewExpose', function(req, res) {
      res.send(routeApp.env.foo);
    });
  });

  it('should return expose value on request http://127.0.0.1:9991/route2/myExpose', function(done) {
    request.get('http://127.0.0.1:9991/route2/myExpose', function(err, res, body) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal('bar');

      done();
    });
  });

  it('should return new expose value on request http://127.0.0.1:9991/route2/myNewExpose', function(done) {
    request.get('http://127.0.0.1:9991/route2/myNewExpose', function(err, res, body) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal('many bars');

      done();
    });
  });
});

describe('API: before', function() {
  var timeExecuted = 0;
  var runTime = 3;

  app.register('route3', function(routeApp) {
    routeApp.before(function(done) {
      timeExecuted += 1;
      done();
    });

    routeApp.get('/visits', function(req, res) {
      res.send('ok');
    });
  });

  it('should execute code just one time request on http://127.0.0.1:9991/route3/visits', function(done) {
    function makeRequest() {
      if(runTime--) {
        request.get('http://127.0.0.1:9991/route3/visits', function(err, res, body) {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.equal('ok');

          makeRequest();
        });

        return ;
      }

      expect(timeExecuted).to.equal(1);
      done();
    }

    makeRequest();
  });
});
