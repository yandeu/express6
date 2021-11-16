const express = require('../')
const request = require('supertest')

const describePromises = global.Promise ? describe : describe.skip

describe('app.route', () => {
  it('should return a new route', done => {
    const app = express()

    app
      .route('/foo')
      .get((req, res) => {
        res.send('get')
      })
      .post((req, res) => {
        res.send('post')
      })

    request(app).post('/foo').expect('post', done)
  })

  it('should all .VERB after .all', done => {
    const app = express()

    app
      .route('/foo')
      .all((req, res, next) => {
        next()
      })
      .get((req, res) => {
        res.send('get')
      })
      .post((req, res) => {
        res.send('post')
      })

    request(app).post('/foo').expect('post', done)
  })

  it('should support dynamic routes', done => {
    const app = express()

    app.route('/:foo').get((req, res) => {
      res.send(req.params.foo)
    })

    request(app).get('/test').expect('test', done)
  })

  it('should not error on empty routes', done => {
    const app = express()

    app.route('/:foo')

    request(app).get('/test').expect(404, done)
  })

  describePromises('promise support', () => {
    it('should pass rejected promise value', done => {
      const app = express()
      const route = app.route('/foo')

      route.all(function createError(req, res, next) {
        return Promise.reject(new Error('boom!'))
      })

      route.all(function helloWorld(req, res) {
        res.send('hello, world!')
      })

      route.all(function handleError(err, req, res, next) {
        res.status(500)
        res.send('caught: ' + err.message)
      })

      request(app).get('/foo').expect(500, 'caught: boom!', done)
    })

    it('should pass rejected promise without value', done => {
      const app = express()
      const route = app.route('/foo')

      route.all(function createError(req, res, next) {
        return Promise.reject()
      })

      route.all(function helloWorld(req, res) {
        res.send('hello, world!')
      })

      route.all(function handleError(err, req, res, next) {
        res.status(500)
        res.send('caught: ' + err.message)
      })

      request(app).get('/foo').expect(500, 'caught: Rejected promise', done)
    })

    it('should ignore resolved promise', done => {
      const app = express()
      const route = app.route('/foo')

      route.all(function createError(req, res, next) {
        res.send('saw GET /foo')
        return Promise.resolve('foo')
      })

      route.all(() => {
        done(new Error('Unexpected route invoke'))
      })

      request(app).get('/foo').expect(200, 'saw GET /foo', done)
    })

    describe('error handling', () => {
      it('should pass rejected promise value', done => {
        const app = express()
        const route = app.route('/foo')

        route.all(function createError(req, res, next) {
          return Promise.reject(new Error('boom!'))
        })

        route.all(function handleError(err, req, res, next) {
          return Promise.reject(new Error('caught: ' + err.message))
        })

        route.all(function handleError(err, req, res, next) {
          res.status(500)
          res.send('caught again: ' + err.message)
        })

        request(app).get('/foo').expect(500, 'caught again: caught: boom!', done)
      })

      it('should pass rejected promise without value', done => {
        const app = express()
        const route = app.route('/foo')

        route.all(function createError(req, res, next) {
          return Promise.reject(new Error('boom!'))
        })

        route.all(function handleError(err, req, res, next) {
          return Promise.reject()
        })

        route.all(function handleError(err, req, res, next) {
          res.status(500)
          res.send('caught again: ' + err.message)
        })

        request(app).get('/foo').expect(500, 'caught again: Rejected promise', done)
      })

      it('should ignore resolved promise', done => {
        const app = express()
        const route = app.route('/foo')

        route.all(function createError(req, res, next) {
          return Promise.reject(new Error('boom!'))
        })

        route.all(function handleError(err, req, res, next) {
          res.status(500)
          res.send('caught: ' + err.message)
          return Promise.resolve('foo')
        })

        route.all(() => {
          done(new Error('Unexpected route invoke'))
        })

        request(app).get('/foo').expect(500, 'caught: boom!', done)
      })
    })
  })
})
