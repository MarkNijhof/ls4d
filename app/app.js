
/**
 * Module dependencies.
 */

var express = require('express')
  , cons = require('consolidate')
  , router = require('./lib/router')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , path = require('path')

var process_env = require('./environment').variables()
var article_parser = require('./lib/article_parser')

var articles = article_parser.parse_folder_sync(__dirname +'/articles')

var app = express()

app.configure(function(){
  app.engine('ejs', cons.ejs)
  app.set('port', process_env.PORT || 3000)
  app.set('views', __dirname + '/views')
  app.set('view engine', 'ejs')
  app.set('articles', articles)
  app.use(express.favicon(__dirname + '/public/favicon.ico'))
  app.use(express.logger('dev'))
  // app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + "/public/uploads" }))
  app.use(express.methodOverride())
  app.use(app.router)
  app.use(require('stylus').middleware(__dirname + '/public'))
  app.use(express.static(path.join(__dirname, 'public')))
})

app.configure('development', function(){
  app.use(express.errorHandler())
})

app.all('*', function(req, res, next) {
  var schema = req.headers["x-forwarded-proto"]

  if (!schema) {
    return next()
  }

  if (req.headers.host.substring(0, 4).toLowerCase() === "www.") {
    return res.redirect("http://" + req.headers.host.substring(4) + req.url)
  }

  // var url = "/get/script"
  // if (schema.toLowerCase() === "https" || req.url.toLowerCase().substring(0, url.length) === url || schema === undefined) {
  //   return next()
  // }

  // res.redirect("http://" + req.headers.host + req.url)
  return next()
})

// GLOBALS OH MY!
var Router = router.init()
Router.build(app)
___all_the_routes = Router.routes()

// app.error(function(err, req, res, next){
//     if (err instanceof NotFound) {
//         res.render('404.jade', { locals: { 
//                   title : '404 - Not Found'
//                  ,description: ''
//                  ,author: ''
//                  ,analyticssiteid: 'XXXXXXX' 
//                 },status: 404 });
//     } else {
//         res.render('500.jade', { locals: { 
//                   title : 'The Server Encountered an Error'
//                  ,description: ''
//                  ,author: ''
//                  ,analyticssiteid: 'XXXXXXX'
//                  ,error: err 
//                 },status: 500 });
//     }
// });

// server.get('/*', function(req, res){
//     throw new NotFound;
// });
// 
// function NotFound(msg){
//     this.name = 'NotFound';
//     Error.call(this, msg);
//     Error.captureStackTrace(this, arguments.callee);
// }

app.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'))
})
