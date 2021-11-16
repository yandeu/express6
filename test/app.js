const assert = require('assert')
const express = require('..')
const request = require('supertest')

describe('app', () => {
  it('should inherit from event emitter', done => {
    const app = express()
    app.on('foo', done)
    app.emit('foo')
  })

  it('should be callable', () => {
    const app = express()
    assert.equal(typeof app, 'function')
  })

  it('should 404 without routes', done => {
    request(express()).get('/').expect(404, done)
  })
})

describe('app.parent', () => {
  it('should return the parent when mounted', () => {
    const app = express(),
      blog = express(),
      blogAdmin = express()

    app.use('/blog', blog)
    blog.use('/admin', blogAdmin)

    assert(!app.parent, 'app.parent')
    blog.parent.should.equal(app)
    blogAdmin.parent.should.equal(blog)
  })
})

describe('app.mountpath', () => {
  it('should return the mounted path', () => {
    const admin = express()
    const app = express()
    const blog = express()
    const fallback = express()

    app.use('/blog', blog)
    app.use(fallback)
    blog.use('/admin', admin)

    admin.mountpath.should.equal('/admin')
    app.mountpath.should.equal('/')
    blog.mountpath.should.equal('/blog')
    fallback.mountpath.should.equal('/')
  })
})

// deprecated
// see: https://github.com/expressjs/express/commit/8c6f9c42531e0fc5f85981484588d569cca26f63
/* describe('app.router', function(){
  it('should throw with notice', function(done){
    var app = express()

    try {
      app.router;
    } catch(err) {
      done();
    }
  })
}) */

describe('app.path()', () => {
  it('should return the canonical', () => {
    const app = express(),
      blog = express(),
      blogAdmin = express()

    app.use('/blog', blog)
    blog.use('/admin', blogAdmin)

    app.path().should.equal('')
    blog.path().should.equal('/blog')
    blogAdmin.path().should.equal('/blog/admin')
  })
})

describe('in development', () => {
  it('should disable "view cache"', () => {
    process.env.NODE_ENV = 'development'
    const app = express()
    app.enabled('view cache').should.be.false()
    process.env.NODE_ENV = 'test'
  })
})

describe('in production', () => {
  it('should enable "view cache"', () => {
    process.env.NODE_ENV = 'production'
    const app = express()
    app.enabled('view cache').should.be.true()
    process.env.NODE_ENV = 'test'
  })
})

describe('without NODE_ENV', () => {
  it('should default to development', () => {
    process.env.NODE_ENV = ''
    const app = express()
    app.get('env').should.equal('development')
    process.env.NODE_ENV = 'test'
  })
})
