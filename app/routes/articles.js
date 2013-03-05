
exports.index = function(req, res) {
  var protocol  = req.headers["x-forwarded-proto"] ? req.headers["x-forwarded-proto"].toLowerCase() : 'http'
  var domain    = req.host === 'localhost' ? 'localhost:3000' : req.host.toLowerCase()
  var articles  = req.app.settings.articles
  
  res.render('articles/index', { domain: protocol +'://'+ domain, articles: articles })
}

exports.article = function(req, res) {
  var protocol  = req.headers["x-forwarded-proto"] ? req.headers["x-forwarded-proto"].toLowerCase() : 'http'
  var domain    = req.host === 'localhost' ? 'localhost:3000' : req.host.toLowerCase()
  var url       = req.params.url
  var articles  = req.app.settings.articles
  
  for (index in articles) {
    var article = articles[index]
    if (article.url === url && article.published) {
      res.render('articles/article', { domain: protocol +'://'+ domain, article: article })
      return
    }
  }
  
  res.redirect(___all_the_routes.articles.url())
}