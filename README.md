# Route99

    var Route99 = require('route99');
    var app = new Route99();

    var Client = function(app) {
      // GET /
      app.get('/ip', function(req, res) {
        res.send({
          'ip': '127.0.0.1'
        });
      });

      // GET /
      app.get('/user-agent', function(req, res) {
        res.send({
          'userAgent': 'firefox'
        });
      });
    };

    // GET /client[/ip, /user-agent]
    app.register('client', Client);

    // Start server
    app.listen({
      port: 1338,
      charset: 'utf-8'
    });
    