
var request = require('request')
var jsdom = require('jsdom')
var process_env = require('../environment').variables()

exports.search = function(search_string, callback){

  search_string = search_string.replace(/\ /g, "+")

  var url = []
  url.push('http://google.com/')
  url.push('search')
  url.push('?q=')
  url.push(search_string)
  
  request.get(url.join(''), function(error, response, body) {
    jsdom.env(
      body,
      ["http://code.jquery.com/jquery.js"],
      {
        features: {
          FetchExternalResources: false
        }
      },
      function(errors, window) {
        var html_body = window.$("#ires").html()
        html_body = html_body
          .replace(/\/url\?q=/g, '')
          .replace(/"\/imgres\?imgurl/g, "\"http://www.google.com/imgres?imgurl")
          .replace(/"\/images\?q=/g, "\"http://www.google.com/images?q=")
          .replace(/"\/search\?q=/g, "\"http://www.google.com/search?q=")
        callback(html_body)
      }
    );
  })
}
