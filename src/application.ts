/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel (https://github.com/yandeu)
 * MIT Licensed
 */

import finalhandler from 'finalhandler'
import { Router } from './router/index.js'
import methods from 'methods'
import _debug from 'debug'
import { View } from './view.js'
import http from 'http'
import { applyMixins, compileETag, compileQueryParser, compileTrust } from './utils.js'
import { flatten } from 'array-flatten'
import merge from 'utils-merge'
import { resolve } from 'path'
import { EventEmitter } from 'events'
import type { Request, Response, RequestHandler, GetSettings, RESTFunction } from './types.js'
import { ExtensibleFunction } from './utils.js'

const debug = _debug('express:application')
const slice = Array.prototype.slice

/** Variable for trust proxy inheritance back-compat */
const trustProxyDefaultSymbol = '@@symbol:trust_proxy_default'

class Express extends ExtensibleFunction<RequestHandler> {
  cache: any = {}
  engines: any = {}
  settings: any = {}
  locals: any
  mountpath!: string
  parent: any

  request!: Request
  response!: Response

  private _router: any

  get!: GetSettings | RESTFunction
  post!: RESTFunction
  put!: RESTFunction
  patch!: RESTFunction
  delete!: RESTFunction
  copy!: RESTFunction
  head!: RESTFunction
  options!: RESTFunction

  constructor() {
    super((req, res, next) => {
      return this.handle(req, res, next)
    })
  }

  /**
   * Initialize the server.
   *
   *   - setup default configuration
   *   - setup default middleware
   *   - setup route reflection methods
   */
  private init() {
    this.cache = {}
    this.engines = {}
    this.settings = {}

    this.defaultConfiguration()
  }

  /** Initialize application configuration. */
  private defaultConfiguration() {
    const env = process.env.NODE_ENV || 'development'

    // default settings
    this.enable('x-powered-by')
    this.set('etag', 'weak')
    this.set('env', env)
    this.set('query parser', 'extended')
    this.set('subdomain offset', 2)
    this.set('trust proxy', false)

    // trust proxy inherit back-compat
    Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
      configurable: true,
      value: true
    })

    debug('booting in %s mode', env)

    this.on('mount', function onmount(parent) {
      // inherit trust proxy
      if (this.settings[trustProxyDefaultSymbol] === true && typeof parent.settings['trust proxy fn'] === 'function') {
        delete this.settings['trust proxy']
        delete this.settings['trust proxy fn']
      }

      // inherit protos
      Object.setPrototypeOf(this.request, parent.request)
      Object.setPrototypeOf(this.response, parent.response)
      Object.setPrototypeOf(this.engines, parent.engines)
      Object.setPrototypeOf(this.settings, parent.settings)
    })

    // setup locals
    this.locals = Object.create(null)

    // top-most app is mounted at /
    this.mountpath = '/'

    // default locals
    this.locals.settings = this.settings

    // default configuration
    this.set('view', View)
    this.set('views', resolve('views'))
    this.set('jsonp callback name', 'callback')

    if (env === 'production') {
      this.enable('view cache')
    }

    // deprecated
    // see: https://github.com/expressjs/express/commit/8c6f9c42531e0fc5f85981484588d569cca26f63
    /* Object.defineProperty(this, 'router', {
      get: function () {
        throw new Error(
          "'app.router' is deprecated!\nPlease see the 3.x to 4.x migration guide for details on how to update your app."
        )
      }
    }) */
  }

  /** Getting lazily added base router. */
  public get router() {
    if (!this._router) {
      this._router = new Router({
        caseSensitive: this.enabled('case sensitive routing'),
        strict: this.enabled('strict routing')
      })
    }
    return this._router
  }

  /**
   * Dispatch a req, res pair into the application. Starts pipeline processing.
   *
   * If no callback is provided, then default error handlers will respond
   * in the event of an error bubbling through the stack.
   */
  private handle(req: Request, res: Response, callback: Function) {
    const router = this.router

    // final handler
    const done =
      callback ||
      finalhandler(req, res, {
        env: this.get('env'),
        onerror: logerror.bind(this)
      })

    // no routes
    if (!router) {
      debug('no routes defined on app')
      done()
      return
    }

    // set powered by header
    if (this.enabled('x-powered-by')) {
      res.setHeader('X-Powered-By', 'Express')
    }

    // set circular references
    req.res = res
    res.req = req

    // alter the prototypes
    // @ts-ignore
    req.__proto__ = this.request
    // @ts-ignore
    res.__proto__ = this.response

    // setup locals
    if (!res.locals) {
      res.locals = Object.create(null)
    }

    router.handle(req, res, done)
  }

  /**
   * Proxy `Router#use()` to add middleware to the app router.
   * See Router#use() documentation for details.
   *
   * If the _fn_ parameter is an express app, then it will be
   * mounted at the _route_ specified.
   */
  public use(path: string, ...handlers: RequestHandler[])
  public use(...handlers: RequestHandler[])
  public use(fn) {
    let offset = 0
    let path = '/'

    // default path to '/'
    // disambiguate app.use([fn])
    if (typeof fn !== 'function') {
      let arg = fn

      while (Array.isArray(arg) && arg.length !== 0) {
        arg = arg[0]
      }

      // first arg is the path
      if (typeof arg !== 'function') {
        offset = 1
        path = fn
      }
    }

    const fns = flatten(slice.call(arguments, offset))

    if (fns.length === 0) {
      throw new TypeError('app.use() requires a middleware function')
    }

    // setup router
    const router = this.router

    fns.forEach(function (fn) {
      // non-express app
      if (!fn || !fn.handle || !fn.set) {
        return router.use(path, fn)
      }

      debug('.use app under %s', path)
      fn.mountpath = path
      fn.parent = this

      // restore .app property on req and res
      router.use(path, function mounted_app(req, res, next) {
        const orig = req.app
        fn.handle(req, res, function (err) {
          Object.setPrototypeOf(req, orig.request)
          Object.setPrototypeOf(res, orig.response)
          next(err)
        })
      })

      // mounted an app
      fn.emit('mount', this)
    }, this)

    return this
  }

  /**
   * Proxy to the app `Router#route()`
   * Returns a new `Route` instance for the _path_.
   *
   * Routes are isolated middleware stacks for specific paths.
   * See the Route api docs for details.
   */
  public route(path) {
    return this.router.route(path)
  }

  /**
   * Register the given template engine callback `fn`
   * as `ext`.
   *
   * By default will `require()` the engine based on the
   * file extension. For example if you try to render
   * a "foo.ejs" file Express will invoke the following internally:
   *
   *     app.engine('ejs', require('ejs').__express);
   *
   * For engines that do not provide `.__express` out of the box,
   * or if you wish to "map" a different extension to the template engine
   * you may use this method. For example mapping the EJS template engine to
   * ".html" files:
   *
   *     app.engine('html', require('ejs').renderFile);
   *
   * In this case EJS provides a `.renderFile()` method with
   * the same signature that Express expects: `(path, options, callback)`,
   * though note that it aliases this method as `ejs.__express` internally
   * so if you're using ".ejs" extensions you don't need to do anything.
   *
   * Some template engines do not follow this convention, the
   * [Consolidate.js](https://github.com/tj/consolidate.js)
   * library was created to map all of node's popular template
   * engines to follow this convention, thus allowing them to
   * work seamlessly within Express.
   */
  public engine(ext: string, fn: Function): this {
    if (typeof fn !== 'function') {
      throw new Error('callback function required')
    }

    // get file extension
    const extension = ext[0] !== '.' ? `.${ext}` : ext

    // store engine
    this.engines[extension] = fn

    return this
  }

  /**
   * Proxy to `Router#param()` with one added api feature. The _name_ parameter
   * can be an array of names.
   *
   * See the Router#param() docs for more details.
   */
  public param(name: string | any[], fn: Function): this {
    if (Array.isArray(name)) {
      for (let i = 0; i < name.length; i++) {
        this.param(name[i], fn)
      }

      return this
    }

    this.router.param(name, fn)

    return this
  }

  /**
   * Assign `setting` to `val`, or return `setting`'s value.
   *
   *    app.set('foo', 'bar');
   *    app.set('foo');
   *    // => "bar"
   *
   * Mounted servers inherit their parent server's settings.
   */
  public set(setting: string, val?: any): this {
    if (arguments.length === 1) {
      // app.get(setting)
      return this.settings[setting]
    }

    debug('set "%s" to %o', setting, val)

    // set value
    this.settings[setting] = val

    // trigger matched settings
    switch (setting) {
      case 'etag':
        this.set('etag fn', compileETag(val))
        break
      case 'query parser':
        this.set('query parser fn', compileQueryParser(val))
        break
      case 'trust proxy':
        this.set('trust proxy fn', compileTrust(val))

        // trust proxy inherit back-compat
        Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
          configurable: true,
          value: false
        })

        break
    }

    return this
  }

  /**
   * Return the app's absolute pathname
   * based on the parent(s) that have
   * mounted it.
   *
   * For example if the application was
   * mounted as "/admin", which itself
   * was mounted as "/blog" then the
   * return value would be "/blog/admin".
   */
  private path(): string {
    return this.parent ? this.parent.path() + this.mountpath : ''
  }

  /**
   * Check if `setting` is enabled (truthy).
   *
   *    app.enabled('foo')
   *    // => false
   *
   *    app.enable('foo')
   *    app.enabled('foo')
   *    // => true
   */
  public enabled(setting: string): boolean {
    return Boolean(this.set(setting))
  }

  /**
   * Check if `setting` is disabled.
   *
   *    app.disabled('foo')
   *    // => true
   *
   *    app.enable('foo')
   *    app.disabled('foo')
   *    // => false
   */
  public disabled(setting: string): boolean {
    return !this.set(setting)
  }

  /** Enable `setting`. */
  public enable(setting: string): this {
    return this.set(setting, true)
  }

  /** Disable `setting`. */
  public disable(setting: string): this {
    return this.set(setting, false)
  }

  /**
   * Special-cased "all" method, applying the given route `path`,
   * middleware, and callback to _every_ HTTP method.
   */
  public all(path: string, ...handlers: RequestHandler[]): this {
    const route = this.router.route(path)

    for (let i = 0; i < methods.length; i++) {
      // eslint-disable-next-line prefer-spread
      route[methods[i]].apply(route, handlers)
    }

    return this
  }

  /**
   * Render the given view `name` name with `options`
   * and a callback accepting an error and the
   * rendered template string.
   *
   * Example:
   *
   *    app.render('email', { name: 'Tobi' }, function(err, html){
   *      // ...
   *    })
   */
  public render(name: string, options: Object | Function, callback: Function): void {
    const cache = this.cache
    let done = callback
    const engines = this.engines
    let opts = options
    const renderOptions: any = {}
    let view

    // support callback function as second arg
    if (typeof options === 'function') {
      done = options
      opts = {}
    }

    // merge app.locals
    merge(renderOptions, this.locals)

    // merge options._locals
    if ((opts as any)._locals) {
      merge(renderOptions, (opts as any)._locals)
    }

    // merge options
    merge(renderOptions, opts)

    // set .cache unless explicitly provided
    if (renderOptions.cache == null) {
      renderOptions.cache = this.enabled('view cache')
    }

    // primed cache
    if (renderOptions.cache) {
      view = cache[name]
    }

    // view
    if (!view) {
      const View = this.get('view')

      view = new View(name, {
        defaultEngine: this.get('view engine'),
        root: this.get('views'),
        engines: engines
      })

      if (!view.path) {
        const dirs =
          Array.isArray(view.root) && view.root.length > 1
            ? `directories "${view.root.slice(0, -1).join('", "')}" or "${view.root[view.root.length - 1]}"`
            : `directory "${view.root}"`
        const err = new Error(`Failed to lookup view "${name}" in views ${dirs}`)
        // @ts-ignore
        err.view = view
        return done(err)
      }

      // prime the cache
      if (renderOptions.cache) {
        cache[name] = view
      }
    }

    // render
    tryRender(view, renderOptions, done)
  }

  /**
   * Listen for connections.
   *
   * A node `http.Server` is returned, with this
   * application (which is a `Function`) as its
   * callback. If you wish to create both an HTTP
   * and HTTPS server you may do so with the "http"
   * and "https" modules as shown here:
   *
   *    let http = require('http')
   *      , https = require('https')
   *      , express = require('express')
   *      , app = express();
   *
   *    http.createServer(app).listen(80);
   *    https.createServer({ ... }, app).listen(443);
   */
  public listen(port?: number | undefined, listeningListener?: () => void): http.Server
  public listen(
    port?: number | undefined,
    hostname?: string | undefined,
    backlog?: number | undefined,
    listeningListener?: () => void
  ): http.Server
  public listen(...args: any): http.Server {
    const server = http.createServer(this as any)
    return server.listen(...args)
  }
}

/** Delegate `.VERB(...)` calls to `router.VERB(...)`. */
methods.forEach(function (method: string) {
  Express.prototype[method] = function (...path: string[]) {
    if (method === 'get' && arguments.length === 1) {
      // app.get(setting)
      return this.set(path[0])
    }

    const route = this.router.route(path[0])
    // eslint-disable-next-line prefer-spread
    route[method].apply(route, slice.call(path, 1))
    return this
  }
})

/**
 * Log error using console.error.
 *
 * @param {Error} err
 * @private
 */
function logerror(err) {
  /* istanbul ignore next */
  if (this.get('env') !== 'test') console.error(err.stack || err.toString())
}

/**
 * Try rendering a view.
 * @private
 */
function tryRender(view, options, callback) {
  try {
    view.render(options, callback)
  } catch (err) {
    callback(err)
  }
}

/** Create an express application. */
// eslint-disable-next-line no-redeclare
interface Express extends EventEmitter {}
applyMixins(Express, [EventEmitter])

export default Express
export { Express }
