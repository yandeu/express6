/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel (https://github.com/yandeu)
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
import bodyParser from 'body-parser'
import { EventEmitter } from 'events'
import mixin from 'merge-descriptors'
import app_proto from './application.js'
import { Route } from './router/route.js'
import { Router } from './router/index.js'
import { _req as req } from './request.js'
import { _res as res } from './response.js'

/**
 * Create an express application.
 *
 * @return {Function}
 * @api public
 */
const createApplication = () => {
  const app: any = function (req, res, next) {
    app.handle(req, res, next)
  }

  mixin(app, EventEmitter.prototype, false)
  mixin(app, app_proto.prototype, false)

  // expose the prototype that will get set on requests
  app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // expose the prototype that will get set on responses
  app.response = Object.create(res, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  app.init()
  return app as app_proto
}

export default createApplication
export { createApplication as express }

/**
 * Expose the prototypes.
 */

export { Express as application } from './application.js'
export { _req as request } from './request.js'
export { _res as response } from './response.js'

/**
 * Expose constructors.
 */

export { Route }
export { Router }

/**
 * Export Types
 */
export * from './types.js'

/**
 * Expose middleware
 */

const { json, raw, text, urlencoded } = bodyParser
export { json, raw, text, urlencoded }
import _static from 'serve-static'
export { _static as Static }

/**
 * Replace removed middleware with an appropriate error message.
 */
// let removedMiddlewares = [
//   'bodyParser',
//   'compress',
//   'cookieSession',
//   'session',
//   'logger',
//   'cookieParser',
//   'favicon',
//   'responseTime',
//   'errorHandler',
//   'timeout',
//   'methodOverride',
//   'vhost',
//   'csrf',
//   'directory',
//   'limit',
//   'multipart',
//   'staticCache',
//   'query'
// ]

// removedMiddlewares.forEach(function (name) {
//   Object.defineProperty(exports, name, {
//     get: function () {
//       throw new Error(
//         'Most middleware (like ' +
//           name +
//           ') is no longer bundled with Express and must be installed separately. Please see https://github.com/senchalabs/connect#middleware.'
//       )
//     },
//     configurable: true
//   })
// })
