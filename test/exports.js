const assert = require('assert')
const express = require('../')
const request = require('supertest')
const should = require('should')

describe('exports', () => {
  it('should expose Router', () => {
    express.Router.should.be.a.Function()
  })

  it('should expose json middleware', () => {
    assert.equal(typeof express.json, 'function')
    assert.equal(express.json.length, 1)
  })

  it('should expose raw middleware', () => {
    assert.equal(typeof express.raw, 'function')
    assert.equal(express.raw.length, 1)
  })

  it('should expose static middleware', () => {
    assert.equal(typeof express.static, 'function')
    assert.equal(express.static.length, 2)
  })

  it('should expose text middleware', () => {
    assert.equal(typeof express.text, 'function')
    assert.equal(express.text.length, 1)
  })

  it('should expose urlencoded middleware', () => {
    assert.equal(typeof express.urlencoded, 'function')
    assert.equal(express.urlencoded.length, 1)
  })

  xit('should expose the application prototype', () => {
    express.application.set.should.be.a.Function()
  })

  it('should expose the request prototype', () => {
    express.request.accepts.should.be.a.Function()
  })

  it('should expose the response prototype', () => {
    express.response.send.should.be.a.Function()
  })

  xit('should permit modifying the .application prototype', () => {
    express.application.foo = () => {
      return 'bar'
    }
    express().foo().should.equal('bar')
  })

  it('should permit modifying the .request prototype', done => {
    express.request.foo = () => {
      return 'bar'
    }
    const app = express()

    app.use((req, res, next) => {
      res.end(req.foo())
    })

    request(app).get('/').expect('bar', done)
  })

  it('should permit modifying the .response prototype', done => {
    express.response.foo = function () {
      this.send('bar')
    }
    const app = express()

    app.use((req, res, next) => {
      res.foo()
    })

    request(app).get('/').expect('bar', done)
  })
})
