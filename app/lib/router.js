
var index = require('../routes/index')
  , articles = require('../routes/articles')

var process_env = require('../environment').variables()

exports.init = (function() {
  
  function Router() {
    this._routes = {}
  }
  
  Router.prototype.route = function(verb, name, route, handler) {
    var route = {
      verb: verb,
      route: route,
      url: function(replace) {
        var build_route = this.route
        for (item in replace) {
          build_route = build_route.replace(item, replace[item])
        }
        return build_route
      },
      handler: function() {
        return handler
      },
      build: function(app) {
        app[this.verb](this.route, this.handler())
      }
    }
    this._routes[name] = route
  }

  Router.prototype.build = function(app) {
    for (route in this._routes) {
      this._routes[route].build(app)
    }
   // console.log(app.routes)
  }

  Router.prototype.routes = function() {
    return this._routes
  }

  return function() {

    var routes = new Router()
    routes.route('get',     'articles',   '/blog',        articles.index)
    routes.route('get',     'article',    '/blog/:url',   articles.article)
    routes.route('get',     'leanpub',    '/leanpub',     index.leanpub)
    routes.route('get',     'root',       '/',            index.index)
    return routes
  }
  
  
})()
