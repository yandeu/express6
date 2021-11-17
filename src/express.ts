/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel (https://github.com/yandeu)
 * MIT Licensed
 */

/** Module dependencies. */
import { Express } from './application.js'
import { Route } from './router/route.js'
import { Router } from './router/index.js'
import { req } from './request.js'
import { res } from './response.js'

/** Create an express application. */
const createApplication = () => {
  const app = new Express()

  // expose the prototype that will get set on requests
  app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // expose the prototype that will get set on responses
  app.response = Object.create(res, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // @ts-ignore
  app.init()
  return app as Express
}

export default createApplication
export { createApplication as express }

/** Expose the prototypes. */
export { Express as application } from './application.js'
export { req as request } from './request.js'
export { res as response } from './response.js'

/** Expose constructors. */
export { Route }
export { Router }

/** Export Types */
export * from './types.js'

/** Expose middleware */
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
