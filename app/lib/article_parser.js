
var fs = require('fs')
var marked = require('marked')

exports.parse_folder_sync = function(path) {
  
  var files = fs.readdirSync(path)
  var articles = []

  marked.setOptions({
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    langPrefix: 'language-',
    highlight: function(code, lang) {
      if (lang === 'js') {
        return highlighter.javascript(code);
      }
      return code;
    }
  });

  files.reverse().forEach(function(file) {
    var file_content = fs.readFileSync(path +'/'+ file, 'utf8')
    var meta_data = file_content.substring(0, file_content.indexOf('\ncontent:'))
    var content = file_content.substring(file_content.indexOf('content:') + 8)
    
    var item = JSON.parse(meta_data)
    if (item.published) {
      item.content = marked(content)
      articles.push(item)
    }
  })
  
  return articles
  
}