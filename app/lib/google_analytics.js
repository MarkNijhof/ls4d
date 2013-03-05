
var request = require('request')
var fs = require('fs')
var crypto = require('crypto')
var process_env = require('../environment').variables()
var jwt = require('./jwt')

// notasecret
// http://stackoverflow.com/questions/8404275/how-to-export-private-key-from-godaddy-certificate-and-use-with-apache-ssl
// umask 0077
// openssl pkcs12 -in filename.p12 -nocerts -nodes -out filename-key.pem
// umask 0022

exports.track = function(url_to_track, org_request, callback) {
  function base64urlEncode(str) {
    return base64urlEscape(new Buffer(str).toString('base64'))
  }

  function base64urlEscape(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
  
  function getPageRequest(url) {
    url.split()
  }
  
  var url = []
  url.push('https://ssl.google-analytics.com/__utm.gif')
  url.push('?utmwv=5.3.9')
  url.push('&utmn='+ new Date().getTime())
  url.push('&utmhn='+ base64urlEncode(org_request.headers.host))
  url.push('&utmcs=UTF-8')
  url.push('&utmul='+ org_request.headers['accept-language'])
  url.push('&utmr=' + org_request.headers.referer)
  url.push('&utmp=' + url_to_track)
  url.push('&utmac=UA-35161272-2')
  url.push('&utmcc=__utma%3D999.999.999.999.999.1%3B')
    
  request.get(url.join(''),{
    headers: {
      // host:               org_request.headers.host,
      'user-agent':       org_request.headers['user-agent'],
      'accept-language':  org_request.headers['accept-language'],
      // referer:            org_request.headers.referer,
      // connection:         'keep-alive',
      // 'cache-control':    'max-age=0',
      'x-forwarded-for':  (org_request.headers["x-forwarded-for"] || org_request.connection.remoteAddress)
      }
    }, function(error, response, body) { callback() }
  )
}

exports.get_access_token = function(callback) {
  
  var date = new Date()
  var utc_miniseconds = Date.UTC(date.getUTCFullYear(), parseInt(date.getUTCMonth() + 1), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), 000)
  var time = utc_miniseconds / 1000

  var iat = Math.round(date.getTime() / 1000)
  var exp = Math.round(date.getTime() / 1000) + 5
    
  var claimset = {
    "aud": "https://accounts.google.com/o/oauth2/token",
    "scope": "https://www.googleapis.com/auth/analytics.readonly",
    "iat": iat,
    "exp": exp,
    "iss": "224432130466@developer.gserviceaccount.com"
  }
  
  fs.readFile(__dirname + '/../certs/google-key.pem', 'ascii', function (err, key) {
    if (err) {
      return console.log(err)
    }
    
    var token = jwt.encode(claimset, key, 'RS256')

    request.post({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      url: 'https://accounts.google.com/o/oauth2/token',
      form: {
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': token
      }
    }, 
    function(error, response, body) {
      var access_token = JSON.parse(body).access_token
      callback(access_token)
    })
  })
}

exports.get_job_analytics = function(job_id, action, city_zoom, access_token, callback) {
  var google_analytics_id = process_env.GOOGLE_ANALYTICS_ID
  var google_analytics_key = process_env.GOOGLE_ANALYTICS_KEY

  var date = new Date();
  var today = date.getFullYear() +"-"+ ("0"+ (date.getMonth() + 1)).substr(-2,2) +"-"+ ("0"+ date.getDate()).substr(-2,2)
  date.setMonth(date.getMonth() - 1)
  var last_month = date.getFullYear() +"-"+ ("0"+ (date.getMonth() + 1)).substr(-2,2) +"-"+ ("0"+ date.getDate()).substr(-2,2)

  var url = []
  url.push('?ids=ga:'+ google_analytics_id)
  url.push('&dimensions=ga:country')
  if (city_zoom) {
    url.push(',ga:city')
  }
  url.push('&metrics=')
  url.push('ga:visitors')
  url.push(',ga:percentNewVisits')
  url.push(',ga:avgTimeOnPage')
  
  url.push('&filters=ga:pagePath=~^*'+ job_id + action +'*')
  url.push('&start-date='+ last_month)
  url.push('&end-date='+ today)
  url.push('&max-results=5000')

  var url = url.join('')

  request.get({
    headers: { 
      Authorization: 'Bearer '+ access_token,
      'content-type': 'text/plain'
    },
    url: 'https://www.googleapis.com/analytics/v3/data/ga' + url
  }, function(error, response, body) {
    try {
      callback(error, error ? {} : JSON.parse(body))
    } catch(error) {
      callback(error, {})
    }
  })
}

exports.get_website_analytics = function(filter_url, city_zoom, access_token, callback) {
  var google_analytics_id = process_env.GOOGLE_ANALYTICS_ID
  var google_analytics_key = process_env.GOOGLE_ANALYTICS_KEY

  var date = new Date();
  var today = date.getFullYear() +"-"+ ("0"+ (date.getMonth() + 1)).substr(-2,2) +"-"+ ("0"+ date.getDate()).substr(-2,2)
  date.setMonth(date.getMonth() - 1)
  var last_month = date.getFullYear() +"-"+ ("0"+ (date.getMonth() + 1)).substr(-2,2) +"-"+ ("0"+ date.getDate()).substr(-2,2)

  var url = []
  url.push('?ids=ga:'+ google_analytics_id)
  url.push('&dimensions=ga:country')
  if (city_zoom) {
    url.push(',ga:city')
  }

  url.push('&metrics=')
  url.push('ga:visitors')
  url.push(',ga:percentNewVisits')
  url.push(',ga:avgTimeOnPage')
  
  url.push('&filters=ga:pagePath=~^/get/script$')
  url.push(';ga:hostName=~^*'+ filter_url)

  url.push('&start-date='+ last_month)
  url.push('&end-date='+ today)
  url.push('&max-results=100000')

  var url = url.join('')

  request.get({
    headers: { 
      Authorization: 'Bearer '+ access_token,
      'content-type': 'text/plain'
    },
    url: 'https://www.googleapis.com/analytics/v3/data/ga' + url
  }, function(error, response, body) {
    try {
      callback(error, error ? {} : JSON.parse(body))
    } catch(error) {
      callback(error, {})
    }
  })
}

exports.get_website_per_date = function(filter_url, access_token, callback) {
  var google_analytics_id = process_env.GOOGLE_ANALYTICS_ID
  var google_analytics_key = process_env.GOOGLE_ANALYTICS_KEY

  var date = new Date();
  var today = date.getFullYear() +"-"+ ("0"+ (date.getMonth() + 1)).substr(-2,2) +"-"+ ("0"+ date.getDate()).substr(-2,2)
  date.setMonth(date.getMonth() - 1)
  var last_month = date.getFullYear() +"-"+ ("0"+ (date.getMonth() + 1)).substr(-2,2) +"-"+ ("0"+ date.getDate()).substr(-2,2)

  var url = []
  url.push('?ids=ga:'+ google_analytics_id)
  url.push('&dimensions=ga:date')

  url.push('&metrics=')
  url.push('ga:visitors')
  url.push(',ga:percentNewVisits')
  url.push(',ga:avgTimeOnPage')
  
  url.push('&filters=ga:pagePath=~^/get/script$')
  url.push(';ga:hostName=~^*'+ filter_url)

  url.push('&start-date='+ last_month)
  url.push('&end-date='+ today)
  url.push('&max-results=100000')

  var url = url.join('')

  request.get({
    headers: { 
      Authorization: 'Bearer '+ access_token,
      'content-type': 'text/plain'
    },
    url: 'https://www.googleapis.com/analytics/v3/data/ga' + url
  }, function(error, response, body) {
    try {
      callback(error, error ? {} : JSON.parse(body))
    } catch(error) {
      callback(error, {})
    }
  })
}

exports.get_keywords = function(job_id, access_token, callback) {
  var google_analytics_id = process_env.GOOGLE_ANALYTICS_ID
  var google_analytics_key = process_env.GOOGLE_ANALYTICS_KEY

  var date = new Date();
  var today = date.getFullYear() +"-"+ ("0"+ (date.getMonth() + 1)).substr(-2,2) +"-"+ ("0"+ date.getDate()).substr(-2,2)
  date.setMonth(date.getMonth())
  var last_month = date.getFullYear() +"-"+ ("0"+ (date.getMonth() + 1)).substr(-2,2) +"-"+ ("0"+ date.getDate()).substr(-2,2)

  var url = []
  url.push('?ids=ga:'+ google_analytics_id)
  url.push('&dimensions=')
  url.push('ga:keyword')

  url.push('&metrics=')
  url.push('ga:visitors')
  
  url.push('&filters=ga:pagePath=~^*'+ job_id +'/impression*')
  url.push('&start-date='+ last_month)
  url.push('&end-date='+ today)

  url.push('&max-results=5000')

  var url = url.join('')

  request.get({
    headers: { 
      Authorization: 'Bearer '+ access_token,
      'content-type': 'text/plain'
    },
    url: 'https://www.googleapis.com/analytics/v3/data/ga' + url
  }, function(error, response, body) {
    try {
      callback(error, error ? {} : JSON.parse(body))
    } catch(error) {
      callback(error, {})
    }
  })
}
