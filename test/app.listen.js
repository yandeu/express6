const express = require('../')

describe('app.listen()', () => {
  it('should wrap with an HTTP server', done => {
    const app = express()

    app.get('/tobi', (req, res) => {
      res.end('got tobi!')
    })

    const server = app.listen(9999, () => {
      server.close()
      done()
    })
  })
})
