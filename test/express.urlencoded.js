const assert = require('assert')
const Buffer = require('safe-buffer').Buffer
const express = require('..')
const request = require('supertest')

describe('express.urlencoded()', () => {
  before(function () {
    this.app = createApp()
  })

  it('should parse x-www-form-urlencoded', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('user=tobi')
      .expect(200, '{"user":"tobi"}', done)
  })

  it('should 400 when invalid content-length', done => {
    const app = express()

    app.use((req, res, next) => {
      req.headers['content-length'] = '20' // bad length
      next()
    })

    app.use(express.urlencoded())

    app.post('/', (req, res) => {
      res.json(req.body)
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('str=')
      .expect(400, /content length/, done)
  })

  it('should handle Content-Length: 0', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Content-Length', '0')
      .send('')
      .expect(200, '{}', done)
  })

  it('should handle empty message-body', done => {
    request(createApp({ limit: '1kb' }))
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Transfer-Encoding', 'chunked')
      .send('')
      .expect(200, '{}', done)
  })

  it('should handle duplicated middleware', done => {
    const app = express()

    app.use(express.urlencoded())
    app.use(express.urlencoded())

    app.post('/', (req, res) => {
      res.json(req.body)
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('user=tobi')
      .expect(200, '{"user":"tobi"}', done)
  })

  it('should parse extended syntax', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('user[name][first]=Tobi')
      .expect(200, '{"user":{"name":{"first":"Tobi"}}}', done)
  })

  describe('with extended option', () => {
    describe('when false', () => {
      before(function () {
        this.app = createApp({ extended: false })
      })

      it('should not parse extended syntax', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('user[name][first]=Tobi')
          .expect(200, '{"user[name][first]":"Tobi"}', done)
      })

      it('should parse multiple key instances', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('user=Tobi&user=Loki')
          .expect(200, '{"user":["Tobi","Loki"]}', done)
      })
    })

    describe('when true', () => {
      before(function () {
        this.app = createApp({ extended: true })
      })

      it('should parse multiple key instances', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('user=Tobi&user=Loki')
          .expect(200, '{"user":["Tobi","Loki"]}', done)
      })

      it('should parse extended syntax', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('user[name][first]=Tobi')
          .expect(200, '{"user":{"name":{"first":"Tobi"}}}', done)
      })

      it('should parse parameters with dots', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('user.name=Tobi')
          .expect(200, '{"user.name":"Tobi"}', done)
      })

      it('should parse fully-encoded extended syntax', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('user%5Bname%5D%5Bfirst%5D=Tobi')
          .expect(200, '{"user":{"name":{"first":"Tobi"}}}', done)
      })

      it('should parse array index notation', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('foo[0]=bar&foo[1]=baz')
          .expect(200, '{"foo":["bar","baz"]}', done)
      })

      it('should parse array index notation with large array', function (done) {
        let str = 'f[0]=0'

        for (let i = 1; i < 500; i++) {
          str += `&f[${i}]=${i.toString(16)}`
        }

        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(str)
          .expect(res => {
            const obj = JSON.parse(res.text)
            assert.strictEqual(Object.keys(obj).length, 1)
            assert.strictEqual(Array.isArray(obj.f), true)
            assert.strictEqual(obj.f.length, 500)
          })
          .expect(200, done)
      })

      it('should parse array of objects syntax', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('foo[0][bar]=baz&foo[0][fizz]=buzz&foo[]=done!')
          .expect(200, '{"foo":[{"bar":"baz","fizz":"buzz"},"done!"]}', done)
      })

      it('should parse deep object', function (done) {
        let str = 'foo'

        for (let i = 0; i < 500; i++) {
          str += '[p]'
        }

        str += '=bar'

        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(str)
          .expect(res => {
            const obj = JSON.parse(res.text)
            assert.strictEqual(Object.keys(obj).length, 1)
            assert.strictEqual(typeof obj.foo, 'object')

            let depth = 0
            let ref = obj.foo
            while ((ref = ref.p)) {
              depth++
            }
            assert.strictEqual(depth, 500)
          })
          .expect(200, done)
      })
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
        test.set('Content-Type', 'application/x-www-form-urlencoded')
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
        test.set('Content-Type', 'application/x-www-form-urlencoded')
        test.write(Buffer.from('1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000', 'hex'))
        test.expect(200, '{"name":"论"}', done)
      })
    })
  })

  describe('with limit option', () => {
    it('should 413 when over limit with Content-Length', done => {
      const buf = Buffer.alloc(1024, '.')
      request(createApp({ limit: '1kb' }))
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Content-Length', '1028')
        .send(`str=${buf.toString()}`)
        .expect(413, done)
    })

    it('should 413 when over limit with chunked encoding', done => {
      const buf = Buffer.alloc(1024, '.')
      const app = createApp({ limit: '1kb' })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.set('Transfer-Encoding', 'chunked')
      test.write('str=')
      test.write(buf.toString())
      test.expect(413, done)
    })

    it('should accept number of bytes', done => {
      const buf = Buffer.alloc(1024, '.')
      request(createApp({ limit: 1024 }))
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(`str=${buf.toString()}`)
        .expect(413, done)
    })

    it('should not change when options altered', done => {
      const buf = Buffer.alloc(1024, '.')
      const options = { limit: '1kb' }
      const app = createApp(options)

      options.limit = '100kb'

      request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(`str=${buf.toString()}`)
        .expect(413, done)
    })

    it('should not hang response', done => {
      const buf = Buffer.alloc(10240, '.')
      const app = createApp({ limit: '8kb' })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.write(buf)
      test.write(buf)
      test.write(buf)
      test.expect(413, done)
    })
  })

  describe('with parameterLimit option', () => {
    describe('with extended: false', () => {
      it('should reject 0', () => {
        assert.throws(
          createApp.bind(null, { extended: false, parameterLimit: 0 }),
          /TypeError: option parameterLimit must be a positive number/
        )
      })

      it('should reject string', () => {
        assert.throws(
          createApp.bind(null, { extended: false, parameterLimit: 'beep' }),
          /TypeError: option parameterLimit must be a positive number/
        )
      })

      it('should 413 if over limit', done => {
        request(createApp({ extended: false, parameterLimit: 10 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(11))
          .expect(413, /too many parameters/, done)
      })

      it('should error with type = "parameters.too.many"', done => {
        request(createApp({ extended: false, parameterLimit: 10 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('X-Error-Property', 'type')
          .send(createManyParams(11))
          .expect(413, 'parameters.too.many', done)
      })

      it('should work when at the limit', done => {
        request(createApp({ extended: false, parameterLimit: 10 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(10))
          .expect(expectKeyCount(10))
          .expect(200, done)
      })

      it('should work if number is floating point', done => {
        request(createApp({ extended: false, parameterLimit: 10.1 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(11))
          .expect(413, /too many parameters/, done)
      })

      it('should work with large limit', done => {
        request(createApp({ extended: false, parameterLimit: 5000 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(5000))
          .expect(expectKeyCount(5000))
          .expect(200, done)
      })

      it('should work with Infinity limit', done => {
        request(createApp({ extended: false, parameterLimit: Infinity }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(10000))
          .expect(expectKeyCount(10000))
          .expect(200, done)
      })
    })

    describe('with extended: true', () => {
      it('should reject 0', () => {
        assert.throws(
          createApp.bind(null, { extended: true, parameterLimit: 0 }),
          /TypeError: option parameterLimit must be a positive number/
        )
      })

      it('should reject string', () => {
        assert.throws(
          createApp.bind(null, { extended: true, parameterLimit: 'beep' }),
          /TypeError: option parameterLimit must be a positive number/
        )
      })

      it('should 413 if over limit', done => {
        request(createApp({ extended: true, parameterLimit: 10 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(11))
          .expect(413, /too many parameters/, done)
      })

      it('should error with type = "parameters.too.many"', done => {
        request(createApp({ extended: true, parameterLimit: 10 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('X-Error-Property', 'type')
          .send(createManyParams(11))
          .expect(413, 'parameters.too.many', done)
      })

      it('should work when at the limit', done => {
        request(createApp({ extended: true, parameterLimit: 10 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(10))
          .expect(expectKeyCount(10))
          .expect(200, done)
      })

      it('should work if number is floating point', done => {
        request(createApp({ extended: true, parameterLimit: 10.1 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(11))
          .expect(413, /too many parameters/, done)
      })

      it('should work with large limit', done => {
        request(createApp({ extended: true, parameterLimit: 5000 }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(5000))
          .expect(expectKeyCount(5000))
          .expect(200, done)
      })

      it('should work with Infinity limit', done => {
        request(createApp({ extended: true, parameterLimit: Infinity }))
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(createManyParams(10000))
          .expect(expectKeyCount(10000))
          .expect(200, done)
      })
    })
  })

  describe('with type option', () => {
    describe('when "application/vnd.x-www-form-urlencoded"', () => {
      before(function () {
        this.app = createApp({ type: 'application/vnd.x-www-form-urlencoded' })
      })

      it('should parse for custom type', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/vnd.x-www-form-urlencoded')
          .send('user=tobi')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should ignore standard type', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('user=tobi')
          .expect(200, '{}', done)
      })
    })

    describe('when ["urlencoded", "application/x-pairs"]', () => {
      before(function () {
        this.app = createApp({
          type: ['urlencoded', 'application/x-pairs']
        })
      })

      it('should parse "application/x-www-form-urlencoded"', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('user=tobi')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should parse "application/x-pairs"', function (done) {
        request(this.app)
          .post('/')
          .set('Content-Type', 'application/x-pairs')
          .send('user=tobi')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should ignore application/x-foo', function (done) {
        request(this.app).post('/').set('Content-Type', 'application/x-foo').send('user=tobi').expect(200, '{}', done)
      })
    })

    describe('when a function', () => {
      it('should parse when truthy value returned', done => {
        const app = createApp({ type: accept })

        function accept(req) {
          return req.headers['content-type'] === 'application/vnd.something'
        }

        request(app)
          .post('/')
          .set('Content-Type', 'application/vnd.something')
          .send('user=tobi')
          .expect(200, '{"user":"tobi"}', done)
      })

      it('should work without content-type', done => {
        const app = createApp({ type: accept })

        function accept(req) {
          return true
        }

        const test = request(app).post('/')
        test.write('user=tobi')
        test.expect(200, '{"user":"tobi"}', done)
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
    it('should assert value if function', () => {
      assert.throws(createApp.bind(null, { verify: 'lol' }), /TypeError: option verify must be function/)
    })

    it('should error from verify', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x20) throw new Error('no leading space')
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(' user=tobi')
        .expect(403, 'no leading space', done)
    })

    it('should error with type = "entity.verify.failed"', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x20) throw new Error('no leading space')
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('X-Error-Property', 'type')
        .send(' user=tobi')
        .expect(403, 'entity.verify.failed', done)
    })

    it('should allow custom codes', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] !== 0x20) return
          const err = new Error('no leading space')
          err.status = 400
          throw err
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(' user=tobi')
        .expect(400, 'no leading space', done)
    })

    it('should allow custom type', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] !== 0x20) return
          const err = new Error('no leading space')
          err.type = 'foo.bar'
          throw err
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('X-Error-Property', 'type')
        .send(' user=tobi')
        .expect(403, 'foo.bar', done)
    })

    it('should allow pass-through', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x5b) throw new Error('no arrays')
        }
      })

      request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('user=tobi')
        .expect(200, '{"user":"tobi"}', done)
    })

    it('should 415 on unknown charset prior to verify', done => {
      const app = createApp({
        verify: function (req, res, buf) {
          throw new Error('unexpected verify call')
        }
      })

      const test = request(app).post('/')
      test.set('Content-Type', 'application/x-www-form-urlencoded; charset=x-bogus')
      test.write(Buffer.from('00000000', 'hex'))
      test.expect(415, 'unsupported charset "X-BOGUS"', done)
    })
  })

  describe('charset', () => {
    before(function () {
      this.app = createApp()
    })

    it('should parse utf-8', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8')
      test.write(Buffer.from('6e616d653de8aeba', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should parse when content-length != char length', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8')
      test.set('Content-Length', '7')
      test.write(Buffer.from('746573743dc3a5', 'hex'))
      test.expect(200, '{"test":"å"}', done)
    })

    it('should default to utf-8', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.write(Buffer.from('6e616d653de8aeba', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should fail on unknown charset', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/x-www-form-urlencoded; charset=koi8-r')
      test.write(Buffer.from('6e616d653dcec5d4', 'hex'))
      test.expect(415, 'unsupported charset "KOI8-R"', done)
    })
  })

  describe('encoding', () => {
    before(function () {
      this.app = createApp({ limit: '10kb' })
    })

    it('should parse without encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.write(Buffer.from('6e616d653de8aeba', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should support identity encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'identity')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.write(Buffer.from('6e616d653de8aeba', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should support gzip encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.write(Buffer.from('1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should support deflate encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'deflate')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.write(Buffer.from('789ccb4bcc4db57db16e17001068042f', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should be case-insensitive', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'GZIP')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.write(Buffer.from('1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000', 'hex'))
      test.expect(200, '{"name":"论"}', done)
    })

    it('should fail on unknown encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'nulls')
      test.set('Content-Type', 'application/x-www-form-urlencoded')
      test.write(Buffer.from('000000000000', 'hex'))
      test.expect(415, 'unsupported content encoding "nulls"', done)
    })
  })
})

function createManyParams(count) {
  let str = ''

  if (count === 0) {
    return str
  }

  str += '0=0'

  for (let i = 1; i < count; i++) {
    const n = i.toString(36)
    str += `&${n}=${n}`
  }

  return str
}

function createApp(options) {
  const app = express()

  app.use(express.urlencoded(options))

  app.use((err, req, res, next) => {
    res.status(err.status || 500)
    res.send(String(err[req.headers['x-error-property'] || 'message']))
  })

  app.post('/', (req, res) => {
    res.json(req.body)
  })

  return app
}

function expectKeyCount(count) {
  return res => {
    assert.strictEqual(Object.keys(JSON.parse(res.text)).length, count)
  }
}
