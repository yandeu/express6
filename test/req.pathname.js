const express = require('../'),
  request = require('supertest')

describe('req', () => {
  describe('.pathname', () => {
    it('should return the parsed pathname', done => {
      const app = express()

      app.use((req, res) => {
        res.end(req.pathname)
      })

      request(app).get('/login?redirect=/post/1/comments').expect('/login', done)
    })
  })
})
