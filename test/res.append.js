const express = require('..')
const request = require('supertest')
const should = require('should')

describe('res', () => {
  // note about these tests: "Link" and "X-*" are chosen because
  // the common node.js versions white list which _incoming_
  // headers can appear multiple times; there is no such white list
  // for outgoing, though
  describe('.append(field, val)', () => {
    it('should append multiple headers', done => {
      const app = express()

      app.use((req, res, next) => {
        res.append('Link', '<http://localhost/>')
        next()
      })

      app.use((req, res) => {
        res.append('Link', '<http://localhost:80/>')
        res.end()
      })

      request(app).get('/').expect('Link', '<http://localhost/>, <http://localhost:80/>', done)
    })

    it('should accept array of values', done => {
      const app = express()

      app.use((req, res, next) => {
        res.append('Set-Cookie', ['foo=bar', 'fizz=buzz'])
        res.end()
      })

      request(app)
        .get('/')
        .expect(res => {
          should(res.headers['set-cookie']).eql(['foo=bar', 'fizz=buzz'])
        })
        .expect(200, done)
    })

    it('should get reset by res.set(field, val)', done => {
      const app = express()

      app.use((req, res, next) => {
        res.append('Link', '<http://localhost/>')
        res.append('Link', '<http://localhost:80/>')
        next()
      })

      app.use((req, res) => {
        res.set('Link', '<http://127.0.0.1/>')
        res.end()
      })

      request(app).get('/').expect('Link', '<http://127.0.0.1/>', done)
    })

    it('should work with res.set(field, val) first', done => {
      const app = express()

      app.use((req, res, next) => {
        res.set('Link', '<http://localhost/>')
        next()
      })

      app.use((req, res) => {
        res.append('Link', '<http://localhost:80/>')
        res.end()
      })

      request(app).get('/').expect('Link', '<http://localhost/>, <http://localhost:80/>', done)
    })

    it('should work with cookies', done => {
      const app = express()

      app.use((req, res, next) => {
        res.cookie('foo', 'bar')
        next()
      })

      app.use((req, res) => {
        res.append('Set-Cookie', 'bar=baz')
        res.end()
      })

      request(app)
        .get('/')
        .expect(res => {
          should(res.headers['set-cookie']).eql(['foo=bar; Path=/', 'bar=baz'])
        })
        .expect(200, done)
    })
  })
})
