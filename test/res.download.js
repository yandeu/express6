const after = require('after')
const assert = require('assert')
const Buffer = require('safe-buffer').Buffer
const express = require('..')
const request = require('supertest')

describe('res', () => {
  describe('.download(path)', () => {
    it('should transfer as an attachment', done => {
      const app = express()

      app.use((req, res) => {
        res.download('test/fixtures/user.html')
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect('Content-Disposition', 'attachment; filename="user.html"')
        .expect(200, '<p>{{user.name}}</p>', done)
    })
  })

  describe('.download(path, filename)', () => {
    it('should provide an alternate filename', done => {
      const app = express()

      app.use((req, res) => {
        res.download('test/fixtures/user.html', 'document')
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect('Content-Disposition', 'attachment; filename="document"')
        .expect(200, done)
    })
  })

  describe('.download(path, fn)', () => {
    it('should invoke the callback', done => {
      const app = express()
      const cb = after(2, done)

      app.use((req, res) => {
        res.download('test/fixtures/user.html', cb)
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect('Content-Disposition', 'attachment; filename="user.html"')
        .expect(200, cb)
    })
  })

  describe('.download(path, filename, fn)', () => {
    it('should invoke the callback', done => {
      const app = express()
      const cb = after(2, done)

      app.use((req, res) => {
        res.download('test/fixtures/user.html', 'document', done)
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect('Content-Disposition', 'attachment; filename="document"')
        .expect(200, cb)
    })
  })

  describe('.download(path, filename, options, fn)', () => {
    it('should invoke the callback', done => {
      const app = express()
      const cb = after(2, done)
      const options = {}

      app.use((req, res) => {
        res.download('test/fixtures/user.html', 'document', options, done)
      })

      request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect('Content-Disposition', 'attachment; filename="document"')
        .end(cb)
    })

    it('should allow options to res.sendFile()', done => {
      const app = express()

      app.use((req, res) => {
        res.download('test/fixtures/.name', 'document', {
          dotfiles: 'allow',
          maxAge: '4h'
        })
      })

      request(app)
        .get('/')
        .expect(200)
        .expect('Content-Disposition', 'attachment; filename="document"')
        .expect('Cache-Control', 'public, max-age=14400')
        .expect(shouldHaveBody(Buffer.from('tobi')))
        .end(done)
    })

    describe('when options.headers contains Content-Disposition', () => {
      it('should be ignored', done => {
        const app = express()

        app.use((req, res) => {
          res.download('test/fixtures/user.html', 'document', {
            headers: {
              'Content-Type': 'text/x-custom',
              'Content-Disposition': 'inline'
            }
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Content-Type', 'text/x-custom')
          .expect('Content-Disposition', 'attachment; filename="document"')
          .end(done)
      })

      it('should be ignored case-insensitively', done => {
        const app = express()

        app.use((req, res) => {
          res.download('test/fixtures/user.html', 'document', {
            headers: {
              'content-type': 'text/x-custom',
              'content-disposition': 'inline'
            }
          })
        })

        request(app)
          .get('/')
          .expect(200)
          .expect('Content-Type', 'text/x-custom')
          .expect('Content-Disposition', 'attachment; filename="document"')
          .end(done)
      })
    })
  })

  describe('on failure', () => {
    it('should invoke the callback', done => {
      const app = express()

      app.use((req, res, next) => {
        res.download('test/fixtures/foobar.html', err => {
          if (!err) return next(new Error('expected error'))
          res.send(`got ${err.status} ${err.code}`)
        })
      })

      request(app).get('/').expect(200, 'got 404 ENOENT', done)
    })

    it('should remove Content-Disposition', done => {
      const app = express()

      app.use((req, res, next) => {
        res.download('test/fixtures/foobar.html', err => {
          if (!err) return next(new Error('expected error'))
          res.end('failed')
        })
      })

      request(app).get('/').expect(shouldNotHaveHeader('Content-Disposition')).expect(200, 'failed', done)
    })
  })
})

function shouldHaveBody(buf) {
  return res => {
    const body = !Buffer.isBuffer(res.body) ? Buffer.from(res.text) : res.body
    assert.ok(body, 'response has body')
    assert.strictEqual(body.toString('hex'), buf.toString('hex'))
  }
}

function shouldNotHaveHeader(header) {
  return res => {
    assert.ok(!(header.toLowerCase() in res.headers), `should not have header ${header}`)
  }
}
