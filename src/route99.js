'use strict';

var http = require('http');
var url = require('url');
var extend = require('util')._extend;

var DEFAULT_CONFIG = {
  timeout: 30 * 1000,
  gzip: true,
  charset: 'utf-8'
};

/**
 * Erro 404 padrão.
 */
function _defaultNotFound(req, res) {
  res.send(404, { error: true, message: '404 Not Found' });
}

/**
 * Retorna se a rota é estática.
 * Uma rota estática não possui parâmetros variáveis (/:foo/)
 *
 * @param {String} path
 * @return {Boolean}
 */
function _isStaticRoute(path) {
  return path.match(/:/) === null ? true : false;
}

/**
 * Executa os middlewares registrados.
 *
 * @param {Array} arr Middlewares registrados para o serviço
 * @param {Array} params Parâmetros que serão enviados para os middlwares
 * @param {Function} end Callback executado ao fim de todos os middlewares
 */
function _execMiddleware(arr, params, end) {
  if(arr.length === 0) {
    // no more middleware to run
    end.apply(null, params);
  } else {
    var middleware = arr[0];
    var middlewareParams = extend([], params);

    // adiciona `next` ao array de parâmetros
    middlewareParams.push(function() {
      _execMiddleware(arr.slice(1), params, end);
    });

    middleware.apply(arr, middlewareParams);
  }

  return;
}

function Route99() {

  var middlewares = [];
  var beforeInit = {};
  var routes = {};

  // route not found
  var routeNotFound = _defaultNotFound;

  /**
   * Registra a rota para o serviço.
   * `toMatch` pode ser uma string ou um array de string.
   *
   * @param {String}   toMatch Definição da rota (ie.: '/', '/blog', '/services')
   * @param {Array}    toMatch Array com definição de várias rotas para o mesmo trigger (ie.: ['/', '/index.htm', '/index.html'])
   * @param {Function} trigger Função que será executada quando houver match de rota
   */
  function setGetRoute(toMatch, trigger) {
    if(typeof toMatch === 'string') {
      // adiciona barra inicial
      if(toMatch.match(/^\//) === null) {
        toMatch = '/'.concat(toMatch);
      }

      // remove a última barra
      toMatch = toMatch.replace(/\/$/, '');

      routes[toMatch] = trigger;
    } else if(Array.isArray(toMatch) === true) {
      for(var i = 0, max = toMatch.length; i < max; i++) {
        setGetRoute(toMatch[i], trigger);
      }
    }
  }

  /**
   * Sobrescreve a rota padrão de erro 404.
   *
   * @param {Function} trigger Função que será executada no erro 404
   */
  function setRouteNotFound(trigger) {
    routeNotFound = trigger;
  }

  /**
   * Procura, entre as rotas cadastradas, a primeira que faz match com o path
   * acessado pelo usuário.
   *
   * @param {String} path Path acessado pelo usuário
   * @return {Object} null será retornado se não houver match com nenhuma rota
   * @return {Function} Trigger da rota será retornado quando houver match.
   */
  function findRoute(requestPath, req) {
    var splitedRequestPath = requestPath.split('/');

    for(var route in routes) {
      if(_isStaticRoute(route) === true) {
        // se a rota não possui paths variáveis (/:foo/)
        // tenta dar match simples
        if(route === requestPath) {
          return routes[route];
        }
      } else {
        var routePathSplited = route.split('/');

        // paths com quantidade de parâmetros diferentes não
        // irão dar match
        if(routePathSplited.length != splitedRequestPath.length) {
          continue;
        }

        var match = true;

        for(var i = 0, m = splitedRequestPath.length; i < m; i++) {
          if(_isStaticRoute(routePathSplited[i]) === true) {
            // paths estáticos sempre devem ser iguais
            if(splitedRequestPath[i] != routePathSplited[i]) {
              match = false;
              break;
            }
          } else {
            if(splitedRequestPath[i] == '') {
              // evita de dar match em rotas com barra no final.
              // exemplo de request que cai nesse if:
              // app.get('/post/:id') -> GET /post/
              match = false;
              break;
            }

            // preenche o objeto com os parâmetros variáveis da url
            req.params[routePathSplited[i].replace(':', '')] = splitedRequestPath[i];
          }
        }

        if(match === true) {
          return routes[route];
        }
      }
    }

    return null;
  }

  /**
   * Através do pathname da rota, executa algum beforeInit que
   * tenha sido registrado antes de executar o `get` registrado.
   *
   * @param {String} routePath path do request
   * @param {Function} next Função que será executada após o beforeInit
   */
  function executeBeforeInit(routePath, next) {
    // nome da api é a primeira parte do pathname
    var api = routePath.match(/^\/([^/]+)\//);
    api     = api && api[1];

    var before = beforeInit[api];

    if(before === undefined) {
      next();
    } else {
      // dispara os befores
      before.call(null, function() {
        next();

        delete beforeInit[api];
      });
    }
  }

  function registerApiService(basepath, module) {
    var moduleApp = {
      get: function(toMatch, trigger) {
        setGetRoute(basepath + toMatch, trigger);
      },
      before: function(trigger) {
        setBeforeInit(basepath, trigger);
      },
      env: this.env,
      expose: expose
    };

    module.call(null, moduleApp);
  }

  function registerModule(middleware) {
    middlewares.push(middleware);
  }

  function expose(attr, value) {
    this.env[attr] = value;
  }

  function setBeforeInit(basepath, trigger) {
    beforeInit[basepath] = trigger;
  }

  /**
   * Cria o servidor e faz o redirecionamento das
   * rotas registradas.
   *
   * @param {Int} port Número da porta que o server irá rodar <defualt: 2080>
   */
  function listen(otherConfigs) {
    var config = extend(extend({}, DEFAULT_CONFIG), otherConfigs);

    var serverInstance = http.createServer(function (req, res) {

      res.notAllowed = function() {
        res.writeHead(405, {'Content-Type': 'text/plain; charset=' + config.charset});
        res.end();
      }

      if(req.method.toUpperCase() != 'GET') {
        return res.notAllowed();
      }

      var urlParts = url.parse(req.url, true);

      req.params = {};
      req.query  = urlParts.query;

      res.send = function() {
        var code, toSend;
        var args = arguments.length;

        if(args == 2) {
          code   = arguments[0];
          toSend = arguments[1];
        } else {
          code   = 200;
          toSend = arguments[0];
        }

        if(typeof toSend == 'object') {
          toSend = JSON.stringify(toSend);
        }

        _execMiddleware(middlewares, [req, res], function(req, res) { // end callback
          var callbackJsonp = req.query.callback;

          // verifica se é jsonp
          if(callbackJsonp) {
            res.writeHead(code, {'Content-Type': 'application/javascript; charset=' + config.charset});
            toSend = 'window.' + callbackJsonp + ' && ' + callbackJsonp + '(' + toSend + ');';
          } else {
            res.writeHead(code, {'Content-Type': 'application/json; charset=' + config.charset});
          }

          res.end(toSend);
        });
      };

      var route = findRoute(urlParts.pathname, req) || routeNotFound;

      // executa beforeInit e responde a rota
      executeBeforeInit(urlParts.pathname, function() {
        route(req, res);
      });

    });

    // tempo de timeout
    serverInstance.timeout = config.timeout;

    serverInstance.listen(config.port, '127.0.0.1');

    console.log(routes);
    console.log('Server running at http://127.0.0.1:%d/', config.port);
  };

  this.env = {};
  this.expose = expose;
  this.listen = listen;
  this.notFound = setRouteNotFound;
  this.register = registerApiService;
  this.use = registerModule;
}

module.exports = Route99;
