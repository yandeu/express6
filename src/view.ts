/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2021 Yannick Deubel (https://github.com/yandeu)
 * MIT Licensed
 */

import { basename, dirname, extname, join, resolve } from 'path'
import d from 'debug'
import fs from 'fs'

const debug = d('express:view')

interface ViewOptions {
  defaultEngine: string
  root: string
  engines: any
}

/**
 * Initialize a new `View` with the given `name`.
 *
 * Options:
 *
 *   - `defaultEngine` the default template engine name
 *   - `engines` template engine require() cache
 *   - `root` root path for view lookup
 */
export class View {
  defaultEngine: string
  ext: string
  name: string
  root: string
  engine: any
  path: string | undefined

  constructor(name: string, options: ViewOptions) {
    this.defaultEngine = options.defaultEngine
    this.ext = extname(name)
    this.name = name
    this.root = options.root

    if (!this.ext && !this.defaultEngine) {
      throw new Error('No default engine was specified and no extension was provided.')
    }

    let fileName = name

    if (!this.ext) {
      // get extension from default engine name
      this.ext = this.defaultEngine[0] !== '.' ? `.${this.defaultEngine}` : this.defaultEngine

      fileName += this.ext
    }

    if (!options.engines[this.ext]) {
      // load engine
      const mod = this.ext.substring(1)
      debug('require "%s"', mod)

      // default engine export
      const fn = require(mod).__express

      if (typeof fn !== 'function') {
        throw new Error(`Module "${mod}" does not provide a view engine.`)
      }

      options.engines[this.ext] = fn
    }

    // store loaded engine
    this.engine = options.engines[this.ext]

    // lookup path
    this.path = this.lookup(fileName)
  }

  /** Lookup view by the given `name` */
  private lookup(name: string): string | undefined {
    let path: string | undefined
    const roots: string[] = ([] as string[]).concat(this.root)

    debug('lookup "%s"', name)

    for (let i = 0; i < roots.length && !path; i++) {
      const root = roots[i]

      // resolve the path
      const loc = resolve(root, name)
      const dir = dirname(loc)
      const file = basename(loc)

      // resolve the file
      path = this.resolve(dir, file)
    }

    return path
  }

  /** Render with the given options. */
  private render(options: Object, callback: Function) {
    let sync = true

    debug('render "%s"', this.path)

    // render, normalizing sync callbacks
    const ctx: View = this
    this.engine(this.path, options, function onRender() {
      if (!sync) {
        return callback.apply(ctx, arguments)
      }

      // copy arguments
      const args = new Array(arguments.length)

      for (let i = 0; i < arguments.length; i++) {
        args[i] = arguments[i]
      }

      // force callback to be async
      return process.nextTick(function renderTick() {
        return callback.apply(ctx, args)
      })
    })

    sync = false
  }

  /** Resolve the file within the given directory. */
  private resolve(dir: string, file: string): string | undefined {
    const ext = this.ext

    // <path>.<ext>
    let path = join(dir, file)
    let stat = tryStat(path)

    if (stat && stat.isFile()) {
      return path
    }

    // <path>/index.<ext>
    path = join(dir, basename(file, ext), `index${ext}`)
    stat = tryStat(path)

    if (stat && stat.isFile()) {
      return path
    }
  }
}

/** Return a stat, maybe. */
function tryStat(path: string): fs.Stats | undefined {
  debug('stat "%s"', path)

  try {
    return fs.statSync(path)
  } catch (e) {
    return undefined
  }
}
