/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel (https://github.com/yandeu)
 * MIT Licensed
 */

import accepts from 'accepts'
import { isIP } from 'net'
import typeis from 'type-is'
import { IncomingMessage } from 'http'
import fresh from 'fresh'
import parseRange from 'range-parser'
import parse from 'parseurl'
import proxyaddr from 'proxy-addr'

class Request extends IncomingMessage {
  app: any
  res: any
  params: any = {}
  body: any = {}
  url!: string

  /**
   * Return request header.
   *
   * The `Referrer` header field is special-cased,
   * both `Referrer` and `Referer` are interchangeable.
   *
   * Examples:
   *
   *     req.get('Content-Type');
   *     // => "text/plain"
   *
   *     req.get('content-type');
   *     // => "text/plain"
   *
   *     req.get('Something');
   *     // => undefined
   *
   * Aliased as `req.header()`.
   *
   * @param {String} name
   * @return {String}
   * @public
   */
  header(name) {
    if (!name) {
      throw new TypeError('name argument is required to req.get')
    }

    if (typeof name !== 'string') {
      throw new TypeError('name must be a string to req.get')
    }

    const lc = name.toLowerCase()

    switch (lc) {
      case 'referer':
      case 'referrer':
        return this.headers.referrer || this.headers.referer
      default:
        return this.headers[lc]
    }
  }

  get(name) {
    return this.header(name)
  }

  /**
   * To do: update docs.
   *
   * Check if the given `type(s)` is acceptable, returning
   * the best match when true, otherwise `undefined`, in which
   * case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single MIME type string
   * such as "application/json", an extension name
   * such as "json", a comma-delimited list such as "json, html, text/plain",
   * an argument list such as `"json", "html", "text/plain"`,
   * or an array `["json", "html", "text/plain"]`. When a list
   * or array is given, the _best_ match, if any is returned.
   *
   * Examples:
   *
   *     // Accept: text/html
   *     req.accepts('html');
   *     // => "html"
   *
   *     // Accept: text/*, application/json
   *     req.accepts('html');
   *     // => "html"
   *     req.accepts('text/html');
   *     // => "text/html"
   *     req.accepts('json, text');
   *     // => "json"
   *     req.accepts('application/json');
   *     // => "application/json"
   *
   *     // Accept: text/*, application/json
   *     req.accepts('image/png');
   *     req.accepts('png');
   *     // => undefined
   *
   *     // Accept: text/*;q=.5, application/json
   *     req.accepts(['html', 'json']);
   *     req.accepts('html', 'json');
   *     req.accepts('html, json');
   *     // => "json"
   *
   * @param {String|Array} type(s)
   * @return {String|Array|Boolean}
   * @public
   */
  accepts() {
    const accept = accepts(this)
    return accept.types(...arguments)
  }

  /** Check if the given `encoding`s are accepted. */
  public acceptsEncodings(...encoding: string[]): string | string[] {
    const accept = accepts(this)
    return accept.encodings(...encoding)
  }

  /**
   * Check if the given `charset`s are acceptable,
   * otherwise you should respond with 406 "Not Acceptable".
   */
  public acceptsCharsets(...charset: string[]): string | string[] {
    const accept = accepts(this)
    return accept.charsets(...charset)
  }

  /**
   * Check if the given `lang`s are acceptable,
   * otherwise you should respond with 406 "Not Acceptable".
   */
  public acceptsLanguages(...lang: string[]): string | string[] {
    const accept = accepts(this)
    return accept.languages(...lang)
  }

  /**
   * Parse Range header field, capping to the given `size`.
   *
   * Unspecified ranges such as "0-" require knowledge of your resource length. In
   * the case of a byte range this is of course the total number of bytes. If the
   * Range header field is not given `undefined` is returned, `-1` when unsatisfiable,
   * and `-2` when syntactically invalid.
   *
   * When ranges are returned, the array has a "type" property which is the type of
   * range that is required (most commonly, "bytes"). Each array element is an object
   * with a "start" and "end" property for the portion of the range.
   *
   * The "combine" option can be set to `true` and overlapping & adjacent ranges
   * will be combined into a single range.
   *
   * NOTE: remember that ranges are inclusive, so for example "Range: users=0-3"
   * should respond with 4 users when available, not 3.
   */
  public range(size: number, options: { combine?: boolean } = {}): number | number[] | undefined {
    const { combine = false } = options
    const range = this.get('Range')
    if (!range) return
    return parseRange(size, range, { combine })
  }

  /**
   * Parse the query string of `req.url`.
   *
   * This uses the "query parser" setting to parse the raw
   * string into an object.
   */
  get query(): string {
    const queryparse = this.app.get('query parser fn')

    if (!queryparse) {
      // parsing is disabled
      return Object.create(null)
    }

    const querystring = parse(this).query

    return queryparse(querystring)
  }

  /**
   * Check if the incoming request contains the "Content-Type"
   * header field, and it contains the give mime `type`.
   *
   * Examples:
   *
   *      // With Content-Type: text/html; charset=utf-8
   *      req.is('html');
   *      req.is('text/html');
   *      req.is('text/*');
   *      // => true
   *
   *      // When Content-Type is application/json
   *      req.is('json');
   *      req.is('application/json');
   *      req.is('application/*');
   *      // => true
   *
   *      req.is('html');
   *      // => false
   *
   * @param {String|Array} types...
   * @return {String|false|null}
   * @public
   */
  is(types) {
    let arr = types

    // support flattened arguments
    if (!Array.isArray(types)) {
      arr = new Array(arguments.length)
      for (let i = 0; i < arr.length; i++) {
        arr[i] = arguments[i]
      }
    }

    return typeis(this, arr)
  }

  /**
   * Return the protocol string "http" or "https"
   * when requested with TLS. When the "trust proxy"
   * setting trusts the socket address, the
   * "X-Forwarded-Proto" header field will be trusted
   * and used if present.
   *
   * If you're running behind a reverse proxy that
   * supplies https for you this may be enabled.
   */
  public get protocol(): string {
    // @ts-ignore
    const proto = this.socket.encrypted ? 'https' : 'http'
    const trust = this.app.get('trust proxy fn')

    if (!trust(this.socket.remoteAddress, 0)) {
      return proto
    }

    // Note: X-Forwarded-Proto is normally only ever a
    //       single value, but this is to be safe.
    const header = this.get('X-Forwarded-Proto') || proto
    const index = header.indexOf(',')

    // @ts-ignore
    return index !== -1 ? header.substring(0, index).trim() : header.trim()
  }

  /**
   * Short-hand for:
   *
   *    req.protocol === 'https'
   */
  public get secure(): boolean {
    return this.protocol === 'https'
  }

  /**
   * Return the remote address from the trusted proxy.
   *
   * The is the remote address on the socket unless
   * "trust proxy" is set.
   */
  public get ip(): string {
    const trust = this.app.get('trust proxy fn')
    return proxyaddr(this, trust)
  }

  /**
   * When "trust proxy" is set, trusted proxy addresses + client.
   *
   * For example if the value were "client, proxy1, proxy2"
   * you would receive the array `["client", "proxy1", "proxy2"]`
   * where "proxy2" is the furthest down-stream and "proxy1" and
   * "proxy2" were trusted.
   */

  public get ips(): string[] {
    const trust = this.app.get('trust proxy fn')
    const addrs = proxyaddr.all(this, trust)

    // reverse the order (to farthest -> closest)
    // and remove socket address
    addrs.reverse().pop()

    return addrs
  }

  /**
   * Return subdomains as an array.
   *
   * Subdomains are the dot-separated parts of the host before the main domain of
   * the app. By default, the domain of the app is assumed to be the last two
   * parts of the host. This can be changed by setting "subdomain offset".
   *
   * For example, if the domain is "tobi.ferrets.example.com":
   * If "subdomain offset" is not set, req.subdomains is `["ferrets", "tobi"]`.
   * If "subdomain offset" is 3, req.subdomains is `["tobi"]`.
   */
  public get subdomains(): string[] {
    const hostname = this.hostname

    if (!hostname) return []

    const offset = this.app.get('subdomain offset')
    const subdomains = !isIP(hostname) ? hostname.split('.').reverse() : [hostname]

    return subdomains.slice(offset)
  }

  /**
   * Short-hand for `new URL(this.url, `http://${this.headers.host}`)`.
   * Returns the parsed parts of "new URL()".
   */
  public get URL() {
    return new URL(this.url, `http://${this.headers.host}`)
  }

  /** @deprecated Please use pathname() instead. */
  public get path(): string {
    return this.URL.pathname
  }

  /** Short-hand for `new URL(this.url, `http://${this.headers.host}`).pathname`. */
  public get pathname(): string {
    return this.URL.pathname
  }

  /**
   * Parse the "Host" header field to a host.
   *
   * When the "trust proxy" setting trusts the socket
   * address, the "X-Forwarded-Host" header field will
   * be trusted.
   */
  public get host(): string | undefined {
    const trust = this.app.get('trust proxy fn')
    let val = this.get('X-Forwarded-Host') as string

    // return only the first host if there are multiple separated by a comma
    if (val) val = val.split(',')[0].trim()

    if (!val || !trust(this.socket.remoteAddress)) {
      val = this.get('Host') as string
    }

    return val || undefined
  }

  /**
   * Parse the "Host" header field to a hostname.
   *
   * When the "trust proxy" setting trusts the socket
   * address, the "X-Forwarded-Host" header field will
   * be trusted.
   */
  public get hostname(): string | undefined {
    const host = this.host

    if (!host) return undefined

    // IPv6 literal support
    const offset = host[0] === '[' ? host.indexOf(']') + 1 : 0
    const index = host.indexOf(':', offset)

    return ~index ? host.substring(0, index) : host
  }

  /**
   * Check if the request is fresh, aka
   * Last-Modified and/or the ETag
   * still match.
   *
   * @return {Boolean}
   * @public
   */

  get fresh() {
    const method = this.method
    const res = this.res
    const status = res.statusCode

    // GET or HEAD for weak freshness validation only
    if ('GET' !== method && 'HEAD' !== method) return false

    // 2xx or 304 as per rfc2616 14.26
    if ((status >= 200 && status < 300) || 304 === status) {
      return fresh(this.headers, {
        etag: res.get('ETag'),
        'last-modified': res.get('Last-Modified')
      })
    }

    return false
  }

  /**
   * Check if the request is stale, aka
   * "Last-Modified" and / or the "ETag" for the
   * resource has changed.
   *
   * @return {Boolean}
   * @public
   */
  get stale() {
    return !this.fresh
  }

  /**
   * Check if the request was an _XMLHttpRequest_.
   *
   * @return {Boolean}
   * @public
   */
  get xhr() {
    const val = this.get('X-Requested-With') || ('' as any)
    return val.toLowerCase() === 'xmlhttprequest'
  }
}

export const req = Object.create(Request.prototype) as Request
