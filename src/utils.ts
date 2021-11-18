/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel (https://github.com/yandeu)
 * MIT Licensed
 */

import { Buffer } from 'safe-buffer'
import contentType from 'content-type'
import { mime } from 'send'
import _etag from 'etag'
import proxyaddr from 'proxy-addr'
import qs from 'qs'
import querystring from 'querystring'

/** Split and trim a string */
const splitAndTrim = (str: string, splitter: string): string[] => {
  return str.split(splitter).map(v => v.trim())
}

/**
 * Create an ETag generator function, generating ETags with
 * the given options.
 *
 * @param {object} options
 * @return {function}
 * @private
 */

const createETagGenerator = options => {
  return (body, encoding) => {
    const buf = !Buffer.isBuffer(body) ? Buffer.from(body, encoding) : body
    return _etag(buf, options)
  }
}

/**
 * Parse an extended query string with qs.
 *
 * @return {Object}
 * @private
 */

const parseExtendedQueryString = str => {
  return qs.parse(str, {
    allowPrototypes: true
  })
}

/**
 * Return strong ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

export const etag = createETagGenerator({ weak: false })

/**
 * Return weak ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

export const wetag = createETagGenerator({ weak: true })

/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @return {Object}
 * @api private
 */

export const normalizeType = type => {
  // @ts-ignore
  return ~type.indexOf('/') ? acceptParams(type) : { value: mime.lookup(type), params: {} }
}

/**
 * Normalize `types`, for example "html" becomes "text/html".
 *
 * @param {Array} types
 * @return {Array}
 * @api private
 */

export const normalizeTypes = types => {
  const ret: any[] = []

  for (let i = 0; i < types.length; ++i) {
    // @ts-ignore
    ret.push(normalizeType(types[i]))
  }

  return ret
}

/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

const acceptParams = (str: string, index?: number) => {
  const parts = splitAndTrim(str, ';')
  const ret = { value: parts[0], quality: 1, params: {}, originalIndex: index }

  for (let i = 1; i < parts.length; ++i) {
    const pms = splitAndTrim(parts[i], '=')
    if ('q' === pms[0]) {
      ret.quality = parseFloat(pms[1])
    } else {
      ret.params[pms[0]] = pms[1]
    }
  }

  return ret
}

/**
 * Compile "etag" value to function.
 *
 * @param  {Boolean|String|Function} val
 * @return {Function}
 * @api private
 */

export const compileETag = val => {
  let fn

  if (typeof val === 'function') {
    return val
  }

  switch (val) {
    case true:
    case 'weak':
      fn = wetag
      break
    case false:
      break
    case 'strong':
      fn = etag
      break
    default:
      throw new TypeError(`unknown value for etag function: ${val}`)
  }

  return fn
}

/**
 * Compile "query parser" value to function.
 *
 * @param  {String|Function} val
 * @return {Function}
 * @api private
 */

export const compileQueryParser = val => {
  let fn

  if (typeof val === 'function') {
    return val
  }

  switch (val) {
    case true:
    case 'simple':
      fn = querystring.parse
      break
    case false:
      break
    case 'extended':
      fn = parseExtendedQueryString
      break
    default:
      throw new TypeError(`unknown value for query parser function: ${val}`)
  }

  return fn
}

/**
 * Compile "proxy trust" value to function.
 *
 * @param  {Boolean|String|Number|Array|Function} val
 * @return {Function}
 * @api private
 */

export const compileTrust = val => {
  if (typeof val === 'function') return val

  if (val === true) {
    // Support plain true/false
    return () => {
      return true
    }
  }

  if (typeof val === 'number') {
    // Support trusting hop count
    return (a, i) => {
      return i < val
    }
  }

  if (typeof val === 'string') {
    // Support comma-separated values
    val = splitAndTrim(val, ',')
  }

  return proxyaddr.compile(val || [])
}

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 * @api private
 */

export const setCharset = (type, charset) => {
  if (!type || !charset) {
    return type
  }

  // parse type
  const parsed = contentType.parse(type)

  // set charset
  parsed.parameters.charset = charset

  // format type
  return contentType.format(parsed)
}

export class ExtensibleFunction<T> extends Function {
  constructor(f: T) {
    super()
    return Object.setPrototypeOf(f, new.target.prototype)
  }
}

// https://www.typescriptlang.org/docs/handbook/mixins.html
export const applyMixins = (derivedCtor: any, constructors: any[]) => {
  constructors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
      )
    })
  })
}
