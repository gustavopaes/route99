# Route99

The `Route99` was developed to be simple. It is a server and route manager to create API Restful services.

## Install

    npm install route99 --save

## Example

`Route99` was developed to be modular. So, each registered route can be a module.

```javascript
// File: routes/client.js
module.exports = function(app) {
  // GET /
  app.get('/', function(req, res) {
    res.send({
      'ip': '127.0.0.1',
      'userAgent': 'Firefox 40'
    });
  });
}

// File: routes/status.js
module.exports = function(app) {
  // GET /
  app.get('/', function(req, res) {
    var memory = getMemoryUsage();
    var cpu = getCpuUsage();

    res.send({
      memory: memory,
      cpu: cpu
    });
  });

  // GET /memory
  app.get('/memory', function(req, res) {
    res.send(getMemoryUsage());
  });

  // GET /cpu
  app.get('/cpu', function(req, res) {
    res.send(getCpuUsage());
  });
}

// File: app.js
var Route99 = require('route99');
var app = new Route99();

// GET /client
app.register('client', require('routes/client'));

// GET /status[/memory, /cpu]
app.register('status', require('routes/status'));

// Start server
app.listen({
  port: 8080,
  charset: 'utf-8',
  timeout: 30 * 1000 // 30s
});
```

## API

### `use`

Register plugins to be executed for each request.

```javascript
var Route99 = require('route99');
var app = new Route99();

app.use(function serverName(req, res, next) {
  res.setHeader('X-Powered-By', 'route99');
  next();
});
```

### `notFound`

Register not found error.

```javascript
var Route99 = require('route99');
var app = new Route99();

app.use(function serverName(req, res) {
  res.writeHead(404, {'Content-Type': 'text/json'});
  res.end({ code: 404, success: false, error: true });
});
```

### `before`

Code to be executed before each request in specific route.

```javascript
module.exports = function(app) {
  app.before(function(done) {
    if(isNotConnectedInDatabase === true) {
      connectDatabaseSync();
    }
    done();
  });

  app.get('/', rootPath);
}
```

### `expose`

Use `expose` to register persistent data to be exposed to your route module.

```javascript
module.exports = function(app) {
  app.before(function(done) {
    app.expose('foo', {'bar': true});
    done();
  });

  app.get('/', function(req, res) {
    // exposed data can be read in `env` object
    res.send(app.env.foo);
  });
}
```

## To Do / Issues

### HTTP Methods
- [x] GET
- [ ] POST
- [ ] PUT
- [ ] DELETE

### Improve
- [ ] Tests

### Know issues
- [ ] api `before` do not receive `req` and `res` objects.
