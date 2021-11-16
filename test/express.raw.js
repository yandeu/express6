const assert = require('assert')
const Buffer = require('safe-buffer').Buffer
const express = require('..')
const request = require('supertest')

describe('express.raw()', () => {
  before(function () {
    this.app = createApp()
  })

  it('should parse application/octet-stream', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .send('the user is tobi')
      .expect(200, { buf: '746865207573657220697320746f6269' }, done)
  })

  it('should 400 when invalid content-length', done => {
    const app = express()

    app.use((req, res, next) => {
      req.headers['content-length'] = '20' // bad length
      next()
    })

    app.use(express.raw())

    app.post('/', (req, res) => {
      if (Buffer.isBuffer(req.body)) {
        res.json({ buf: req.body.toString('hex') })
      } else {
        res.json(req.body)
      }
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .send('stuff')
      .expect(400, /content length/, done)
  })

  it('should handle Content-Length: 0', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .set('Content-Length', '0')
      .expect(200, { buf: '' }, done)
  })

  it('should handle empty message-body', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .set('Transfer-Encoding', 'chunked')
      .send('')
      .expect(200, { buf: '' }, done)
  })

  it('should handle duplicated middleware', done => {
    const app = express()

    app.use(express.raw())
    app.use(express.raw())

    app.post('/', (req, res) => {
      if (Buffer.isBuffer(req.body)) {
        res.json({ buf: req.body.toString('hex') })
      } else {
        res.json(req.body)
      }
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .send('the user is tobi')
      .expect(200, { buf: '746865207573657220697320746f6269' }, done)
  })

  describe('with limit option', () => {
    it('should 413 when over limit with Content-Length', done => {
      const buf = Buffer.alloc(1028, '.')
      const app = createApp({ limit: '1kb' })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.set('Content-Length', '1028')
      test.write(buf)
      test.expect(413, done)
    })

    it('should 413 when over limit with chunked encoding', done => {
      const buf = Buffer.alloc(1028, '.')
      const app = createApp({ limit: '1kb' })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.set('Transfer-Encoding', 'chunked')
      test.write(buf)
      test.expect(413, done)
    })

    it('should accept number of bytes', done => {
      const buf = Buffer.alloc(1028, '.')
      const app = createApp({ limit: 1024 })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(buf)
      test.expect(413, done)
    })

    it('should not change when options altered', done => {
      const buf = Buffer.alloc(1028, '.')
      const options = { limit: '1kb' }
      const app = createApp(options)

      options.limit = '100kb'

      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(buf)
      test.expect(413, done)
    })

    it('should not hang response', done => {
      const buf = Buffer.alloc(10240, '.')
      const app = createApp({ limit: '8kb' })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(buf)
      test.write(buf)
      test.write(buf)
      test.expect(413, done)
    })
  })

  describe('with inflate option', () => {
    describe('when false', () => {
      before(function () {
        this.app = createApp({ inflate: false })
      })

      it('should not accept content-encoding', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Encoding', 'gzip')
        test.set('Content-Type', 'application/octet-stream')
        test.write(Buffer.from('1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000', 'hex'))
        test.expect(415, 'content encoding unsupported', done)
      })
    })

    describe('when true', () => {
      before(function () {
        this.app = createApp({ inflate: true })
      })

      it('should accept content-encoding', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Encoding', 'gzip')
        test.set('Content-Type', 'application/octet-stream')
        test.write(Buffer.from('1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000', 'hex'))
        test.expect(200, { buf: '6e616d653de8aeba' }, done)
      })
    })
  })

  describe('with type option', () => {
    describe('when "application/vnd+octets"', () => {
      before(function () {
        this.app = createApp({ type: 'application/vnd+octets' })
      })

      it('should parse for custom type', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/vnd+octets')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should ignore standard type', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/octet-stream')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, '{}', done)
      })
    })

    describe('when ["application/octet-stream", "application/vnd+octets"]', () => {
      before(function () {
        this.app = createApp({
          type: ['application/octet-stream', 'application/vnd+octets']
        })
      })

      it('should parse "application/octet-stream"', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/octet-stream')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should parse "application/vnd+octets"', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/vnd+octets')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should ignore "application/x-foo"', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/x-foo')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, '{}', done)
      })
    })

    describe('when a function', () => {
      it('should parse when truthy value returned', done => {
        const app = createApp({ type: accept })

        function accept(req) {
          return req.headers['content-type'] === 'application/vnd.octet'
        }

        const test = request(app).post('/')
        test.set('Content-Type', 'application/vnd.octet')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should work without content-type', done => {
        const app = createApp({ type: accept })

        function accept(req) {
          return true
        }

        const test = request(app).post('/')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should not invoke without a body', done => {
        const app = createApp({ type: accept })

        function accept(req) {
          throw new Error('oops!')
        }

        request(app).get('/').expect(404, done)
      })
    })
  })

  describe('with verify option', () => {
    it('should assert value is function', () => {
      assert.throws(createApp.bind(null, { verify: 'lol' }), /TypeError: option verify must be function/)
    })

    it('should error from verify', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x00) throw new Error('no leading null')
        }
      })

      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('000102', 'hex'))
      test.expect(403, 'no leading null', done)
    })

    it('should allow custom codes', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] !== 0x00) return
          const err = new Error('no leading null')
          err.status = 400
          throw err
        }
      })

      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('000102', 'hex'))
      test.expect(400, 'no leading null', done)
    })

    it('should allow pass-through', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x00) throw new Error('no leading null')
        }
      })

      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('0102', 'hex'))
      test.expect(200, { buf: '0102' }, done)
    })
  })

  describe('charset', () => {
    before(function () {
      this.app = createApp()
    })

    it('should ignore charset', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/octet-stream; charset=utf-8')
      test.write(Buffer.from('6e616d6520697320e8aeba', 'hex'))
      test.expect(200, { buf: '6e616d6520697320e8aeba' }, done)
    })
  })

  describe('encoding', () => {
    before(function () {
      this.app = createApp({ limit: '10kb' })
    })

    it('should parse without encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('6e616d653de8aeba', 'hex'))
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should support identity encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'identity')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('6e616d653de8aeba', 'hex'))
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should support gzip encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000', 'hex'))
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should support deflate encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'deflate')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('789ccb4bcc4db57db16e17001068042f', 'hex'))
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should be case-insensitive', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'GZIP')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000', 'hex'))
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should fail on unknown encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'nulls')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('000000000000', 'hex'))
      test.expect(415, 'unsupported content encoding "nulls"', done)
    })
  })
})

function createApp(options) {
  const app = express()

  app.use(express.raw(options))

  app.use((err, req, res, next) => {
    res.status(err.status || 500)
    res.send(String(err[req.headers['x-error-property'] || 'message']))
  })

  app.post('/', (req, res) => {
    if (Buffer.isBuffer(req.body)) {
      res.json({ buf: req.body.toString('hex') })
    } else {
      res.json(req.body)
    }
  })

  return app
}
