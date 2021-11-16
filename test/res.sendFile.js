const after = require('after')
const Buffer = require('safe-buffer').Buffer
const express = require('../'),
  request = require('supertest'),
  assert = require('assert')
const onFinished = require('on-finished')
const path = require('path')
const should = require('should')
const fixtures = path.join(__dirname, 'fixtures')
const utils = require('./support/utils')

describe('res', () => {
  describe('.sendFile(path)', () => {
    it('should error missing path', done => {
      const app = createApp()

      request(app)
        .get('/')
        .expect(500, /path.*required/, done)
    })

    it('should error for non-string path', done => {
      const app = createApp(42)

      request(app)
        .get('/')
        .expect(500, /TypeError: path must be a string to res.sendFile/, done)
    })

    it('should transfer a file', done => {
      const app = createApp(path.resolve(fixtures, 'name.txt'))

      request(app).get('/').expect(200, 'tobi', done)
    })

    it('should transfer a file with special characters in string', done => {
      const app = createApp(path.resolve(fixtures, '% of dogs.txt'))

      request(app).get('/').expect(200, '20%', done)
    })

    it('should include ETag', done => {
      const app = createApp(path.resolve(fixtures, 'name.txt'))

      request(app)
        .get('/')
        .expect('ETag', /^(?:W\/)?"[^"]+"$/)
        .expect(200, 'tobi', done)
    })

    it('should 304 when ETag matches', done => {
      const app = createApp(path.resolve(fixtures, 'name.txt'))

      request(app)
        .get('/')
        .expect('ETag', /^(?:W\/)?"[^"]+"$/)
        .expect(200, 'tobi', (err, res) => {
          if (err) return done(err)
          const etag = res.headers.etag
          request(app).get('/').set('If-None-Match', etag).expect(304, done)
        })
    })

    it('should 404 for directory', done => {
      const app = createApp(path.resolve(fixtures, 'blog'))

      request(app).get('/').expect(404, done)
    })

    it('should 404 when not found', done => {
      const app = createApp(path.resolve(fixtures, 'does-no-exist'))

      app.use((req, res) => {
        res.statusCode = 200
        res.send('no!')
      })

      request(app).get('/').expect(404, done)
    })

    it('should not override manual content-types', done => {
      const app = express()

      app.use((req, res) => {
        res.contentType('application/x-bogus')
        res.sendFile(path.resolve(fixtures, 'name.txt'))
      })

      request(app).get('/').expect('Content-Type', 'application/x-bogus').end(done)
    })

    it('should not error if the client aborts', done => {
      const app = express()
      const cb = after(2, done)
      let error = null

      app.use((req, res) => {
        setImmediate(() => {
          res.sendFile(path.resolve(fixtures, 'name.txt'))
          server.close(cb)
          setTimeout(() => {
            cb(error)
          }, 10)
        })
        test.abort()
      })

      app.use((err, req, res, next) => {
        error = err
        next(err)
      })

      var server = app.listen()
      var test = request(server).get('/')
      test.end()
    })

    describe('with "cacheControl" option', () => {
      it('should enable cacheControl by default', done => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'))

        request(app).get('/').expect('Cache-Control', 'public, max-age=0').expect(200, done)
      })

      it('should accept cacheControl option', done => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), { cacheControl: false })

        request(app).get('/').expect(utils.shouldNotHaveHeader('Cache-Control')).expect(200, done)
      })
    })

    describe('with "dotfiles" option', () => {
      it('should not serve dotfiles by default', done => {
        const app = createApp(path.resolve(__dirname, 'fixtures/.name'))

        request(app).get('/').expect(404, done)
      })

      it('should accept dotfiles option', done => {
        const app = createApp(path.resolve(__dirname, 'fixtures/.name'), { dotfiles: 'allow' })

        request(app)
          .get('/')
          .expect(200)
          .expect(shouldHaveBody(Buffer.from('tobi')))
          .end(done)
      })
    })

    describe('with "headers" option', () => {
      it('should accept headers option', done => {
        const headers = {
          'x-success': 'sent',
          'x-other': 'done'
        }
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), { headers: headers })

        request(app).get('/').expect('x-success', 'sent').expect('x-other', 'done').expect(200, done)
      })

      it('should ignore headers option on 404', done => {
        const headers = { 'x-success': 'sent' }
        const app = createApp(path.resolve(__dirname, 'fixtures/does-not-exist'), { headers: headers })

        request(app).get('/').expect(utils.shouldNotHaveHeader('X-Success')).expect(404, done)
      })
    })

    describe('with "immutable" option', () => {
      it('should add immutable cache-control directive', done => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), {
          immutable: true,
          maxAge: '4h'
        })

        request(app).get('/').expect('Cache-Control', 'public, max-age=14400, immutable').expect(200, done)
      })
    })

    describe('with "maxAge" option', () => {
      it('should set cache-control max-age from number', done => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), {
          maxAge: 14400000
        })

        request(app).get('/').expect('Cache-Control', 'public, max-age=14400').expect(200, done)
      })

      it('should set cache-control max-age from string', done => {
        const app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), {
          maxAge: '4h'
        })

        request(app).get('/').expect('Cache-Control', 'public, max-age=14400').expect(200, done)
      })
    })

    describe('with "root" option', () => {
      it('should not transfer relative with without', done => {
        const app = createApp('test/fixtures/name.txt')

        request(app)
          .get('/')
          .expect(500, /must be absolute/, done)
      })

      it('should serve relative to "root"', done => {
        const app = createApp('name.txt', { root: fixtures })

        request(app).get('/').expect(200, 'tobi', done)
      })

      it('should disallow requesting out of "root"', done => {
        const app = createApp('foo/../../user.html', { root: fixtures })

        request(app).get('/').expect(403, done)
      })
    })
  })

  describe('.sendFile(path, fn)', () => {
    it('should invoke the callback when complete', done => {
      const cb = after(2, done)
      const app = createApp(path.resolve(fixtures, 'name.txt'), cb)

      request(app).get('/').expect(200, cb)
    })

    it('should invoke the callback when client aborts', done => {
      const cb = after(1, done)
      const app = express()

      app.use((req, res) => {
        setImmediate(() => {
          res.sendFile(path.resolve(fixtures, 'name.txt'), err => {
            should(err).be.ok()
            err.code.should.equal('ECONNABORTED')
            server.close(cb)
          })
        })
        test.abort()
      })

      var server = app.listen()
      var test = request(server).get('/')
      test.expect(200, cb)
    })

    it('should invoke the callback when client already aborted', done => {
      const cb = after(1, done)
      const app = express()

      app.use((req, res) => {
        onFinished(res, () => {
          res.sendFile(path.resolve(fixtures, 'name.txt'), err => {
            should(err).be.ok()
            err.code.should.equal('ECONNABORTED')
            server.close(cb)
          })
        })
        test.abort()
      })

      var server = app.listen()
      var test = request(server).get('/')
      test.expect(200, cb)
    })

    it('should invoke the callback without error when HEAD', done => {
      const app = express()
      const cb = after(2, done)

      app.use((req, res) => {
        res.sendFile(path.resolve(fixtures, 'name.txt'), cb)
      })

      request(app).head('/').expect(200, cb)
    })

    it('should invoke the callback without error when 304', done => {
      const app = express()
      const cb = after(3, done)

      app.use((req, res) => {
        res.sendFile(path.resolve(fixtures, 'name.txt'), cb)
      })

      request(app)
        .get('/')
        .expect('ETag', /^(?:W\/)?"[^"]+"$/)
        .expect(200, 'tobi', (err, res) => {
          if (err) return cb(err)
          const etag = res.headers.etag
          request(app).get('/').set('If-None-Match', etag).expect(304, cb)
        })
    })

    it('should invoke the callback on 404', done => {
      const app = express()

      app.use((req, res) => {
        res.sendFile(path.resolve(fixtures, 'does-not-exist'), err => {
          should(err).be.ok()
          err.status.should.equal(404)
          res.send('got it')
        })
      })

      request(app).get('/').expect(200, 'got it', done)
    })
  })

  describe('.sendFile(path, options)', () => {
    it('should pass options to send module', done => {
      request(createApp(path.resolve(fixtures, 'name.txt'), { start: 0, end: 1 }))
        .get('/')
        .expect(200, 'to', done)
    })
  })
})

function createApp(path, options, fn) {
  const app = express()

  app.use((req, res) => {
    res.sendFile(path, options, fn)
  })

  return app
}

function shouldHaveBody(buf) {
  return res => {
    const body = !Buffer.isBuffer(res.body) ? Buffer.from(res.text) : res.body
    assert.ok(body, 'response has body')
    assert.strictEqual(body.toString('hex'), buf.toString('hex'))
  }
}
