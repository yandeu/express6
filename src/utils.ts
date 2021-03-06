/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel (https://github.com/yandeu)
 * MIT Licensed
 */

import _etag from 'etag'
import contentType from 'content-type'
import { mime } from 'send'
import proxyaddr from 'proxy-addr'
import qs from 'qs'
import querystring from 'querystring'

// TODO(yandeu): Improve this
interface TMP {
  originalIndex?: number
  params: { [key: string]: string }
  quality?: number
  value: string
}

/**
 * @copyright   Copyright (c) 2013-2017 Jared Hanson (https://github.com/jaredhanson)
 * @license     {@link https://github.com/jaredhanson/utils-merge/blob/master/LICENSE MIT}
 * @description replaces utils-merge (https://www.npmjs.com/package/utils-merge)
 */
export const merge = (a: object, b: object): object => {
  if (a && b) {
    for (var key in b) {
      a[key] = b[key]
    }
  }
  return a
}

/** Split and trim a string */
const splitAndTrim = (str: string, splitter: string): string[] => {
  return str.split(splitter).map(v => v.trim())
}

/**
 * Create an ETag generator function, generating ETags with
 * the given options.
 */
const createETagGenerator = (options: Object): Function => {
  return (body: string, encoding: BufferEncoding) => {
    const buf = !Buffer.isBuffer(body) ? Buffer.from(body, encoding) : body
    return _etag(buf, options)
  }
}

/** Parse an extended query string with qs. */
const parseExtendedQueryString = (str: string) => {
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

/** Normalize the given `type`, for example "html" becomes "text/html". */
export const normalizeType = (type: string) => {
  return ~type.indexOf('/') ? acceptParams(type) : { value: mime.lookup(type), params: {} }
}

/** Normalize `types`, for example "html" becomes "text/html". */
export const normalizeTypes = (types: string[]): TMP[] => {
  const ret: TMP[] = []

  for (let i = 0; i < types.length; ++i) {
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

const acceptParams = (str: string, index?: number): TMP => {
  const parts = splitAndTrim(str, ';')
  const ret: TMP = { value: parts[0], quality: 1, params: {}, originalIndex: index }

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

/** Compile "etag" value to function. */
export const compileETag = (val: boolean | string | Function): Function => {
  let fn!: Function

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

/** Compile "query parser" value to function. */

export const compileQueryParser = (val: boolean | string | Function): Function => {
  let fn!: Function

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

/** Compile "proxy trust" value to function. */
export const compileTrust = (val: string | string[] | boolean | Function): Function => {
  if (typeof val === 'function') return val

  if (val === true) {
    // Support plain true/false
    return () => {
      return true
    }
  }

  if (typeof val === 'number') {
    // Support trusting hop count
    return (_a: any, i: number) => {
      return i < (val as unknown as number)
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

export const setCharset = (type: string, charset: string): string => {
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
