/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel
 * MIT Licensed
 */

/**
 * This file will be used during mocha test.
 */

'use strict'

const ex = require('./lib/express')

let express = () => {
  return ex.express()
}

express.Route = ex.Route
express.Router = ex.Router
express.query = ex.query
express.application = ex.application
express.request = ex.request
express.response = ex.response

// serve-static
express.static = ex.Static

// bodyParser
express.json = ex.json
express.raw = ex.raw
express.text = ex.text
express.urlencoded = ex.urlencoded

exports = module.exports = express
