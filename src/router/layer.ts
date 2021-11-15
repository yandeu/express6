/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel (https://github.com/yandeu)
 * MIT Licensed
 */

import pathRegexp from 'path-to-regexp'
import _debug from 'debug'

const debug = _debug('express:router:layer')
const hasOwnProperty = Object.prototype.hasOwnProperty

// handle UnhandledPromiseRejection
const isPromise = val =>
  val && typeof val === 'object' && typeof val.then === 'function' && typeof val.catch === 'function'

export class Layer {
  handle: any
  name: any
  params: any
  path: any
  regexp: any
  keys: any[] = []
  method: any
  route: any

  constructor(path, options, fn) {
    if (!(this instanceof Layer)) {
      // @ts-ignore
      return new Layer(path, options, fn)
    }

    debug('new %o', path)
    const opts = options || {}

    this.handle = fn
    this.name = fn.name || '<anonymous>'
    this.params = undefined
    this.path = undefined
    this.regexp = pathRegexp(path, (this.keys = []), opts)

    // set fast path flags
    this.regexp.fast_star = path === '*'
    this.regexp.fast_slash = path === '/' && opts.end === false
  }

  /**
   * Handle the error for the layer.
   *
   * @param {Error} error
   * @param {Request} req
   * @param {Response} res
   * @param {function} next
   * @api private
   */
  handle_error(error, req, res, next) {
    const fn = this.handle

    if (fn.length !== 4) {
      // not a standard error handler
      return next(error)
    }

    // handle UnhandledPromiseRejection
    try {
      // invoke function
      var ret = fn(error, req, res, next)

      // wait for returned promise
      if (isPromise(ret)) {
        ret.then(null, function (error) {
          next(error || new Error('Rejected promise'))
        })
      }
    } catch (err) {
      next(err)
    }
  }

  /**
   * Handle the request for the layer.
   *
   * @param {Request} req
   * @param {Response} res
   * @param {function} next
   * @api private
   */
  handle_request(req, res, next) {
    const fn = this.handle

    if (fn.length > 3) {
      // not a standard request handler
      return next()
    }

    // handle UnhandledPromiseRejection
    try {
      // invoke function
      const ret = fn(req, res, next)

      // wait for returned promise
      if (isPromise(ret)) {
        ret.then(null, function (error) {
          next(error || new Error('Rejected promise'))
        })
      }
    } catch (err) {
      next(err)
    }
  }

  /**
   * Check if this route matches `path`, if so
   * populate `.params`.
   *
   * @param {String} path
   * @return {Boolean}
   * @api private
   */
  match(path) {
    let match

    if (path != null) {
      // fast path non-ending match for / (any path matches)
      if (this.regexp.fast_slash) {
        this.params = {}
        this.path = ''
        return true
      }

      // fast path for * (everything matched in a param)
      if (this.regexp.fast_star) {
        this.params = { 0: decode_param(path) }
        this.path = path
        return true
      }

      // match the path
      match = this.regexp.exec(path)
    }

    if (!match) {
      this.params = undefined
      this.path = undefined
      return false
    }

    // store values
    this.params = {}
    this.path = match[0]

    const keys = this.keys
    const params = this.params

    for (let i = 1; i < match.length; i++) {
      const key = keys[i - 1]
      const prop = key.name
      const val = decode_param(match[i])

      if (val !== undefined || !hasOwnProperty.call(params, prop)) {
        params[prop] = val
      }
    }

    return true
  }
}

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */
function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val
  }

  try {
    return decodeURIComponent(val)
  } catch (err) {
    if (err instanceof URIError) {
      err.message = `Failed to decode param '${val}'`
      // @ts-ignore
      err.status = err.statusCode = 400
    }

    throw err
  }
}
