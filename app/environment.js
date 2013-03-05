
exports.variables = function(node_env) {

  var environment = node_env || process.env.NODE_ENV
  
  if (!environment) {
    console.error("NODE_ENV is not set!")
    return
  }
  
  var port = process.env.PORT
  
  if (environment.toLowerCase() === 'development') {
    return {
      NODE_ENV: 'development',
      PORT: 3000,
      FULL_URL: 'http://localhost:3000',
    }
  }

  if (environment.toLowerCase() === 'test') {
    return {
      NODE_ENV: 'test',
      PORT: port,
      FULL_URL: 'https://test.ls4d.com',
    }
  }

  if (environment.toLowerCase() === 'staging') {
    return {
      NODE_ENV: 'staging',
      PORT: port,
      FULL_URL: 'https://staging.ls4d.com',
    }
  }

  if (environment.toLowerCase() === 'production') {
    return {
      NODE_ENV: 'production',
      PORT: port,
      FULL_URL: 'https://ls4d.com',
    }
  }
}