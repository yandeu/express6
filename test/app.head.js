const express = require('../')
const request = require('supertest')
const assert = require('assert')

describe('HEAD', () => {
  it('should default to GET', done => {
    const app = express()

    app.get('/tobi', (req, res) => {
      // send() detects HEAD
      res.send('tobi')
    })

    request(app).head('/tobi').expect(200, done)
  })

  it('should output the same headers as GET requests', done => {
    const app = express()

    app.get('/tobi', (req, res) => {
      // send() detects HEAD
      res.send('tobi')
    })

    request(app)
      .get('/tobi')
      .expect(200, (err, res) => {
        if (err) return done(err)
        const headers = res.headers
        request(app)
          .get('/tobi')
          .expect(200, (err, res) => {
            if (err) return done(err)
            delete headers.date
            delete res.headers.date
            assert.deepEqual(res.headers, headers)
            done()
          })
      })
  })
})

describe('app.head()', () => {
  it('should override', done => {
    const app = express()
    let called

    app.head('/tobi', (req, res) => {
      called = true
      res.end('')
    })

    app.get('/tobi', (req, res) => {
      assert(0, 'should not call GET')
      res.send('tobi')
    })

    request(app)
      .head('/tobi')
      .expect(200, () => {
        assert(called)
        done()
      })
  })
})
