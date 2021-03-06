/**
 * This file will be served in you run "npm start".
 */

import { get } from 'http'
import { express, RequestHandler, Router } from './lib/express.js'
import http from 'http'

const port = 3000
const app = express()
const server = http.createServer(app as any)
const router = new Router()

router.use((req, res, next) => {
  console.log('Time: ', Date.now())
  next()
})

app.use(router as unknown as RequestHandler)

app.use((req, res, next) => {
  console.log('use()')
  return next()
})

app.get('/', (req, res) => {
  console.log("get '/'")
  return res.json({ success: true })
})

app.post('/', (req, res) => {
  console.log("post '/'")
  return res.json({ success: true })
})

server.listen(port, () => {
  console.log('listen on port', port, `(http://localhost:${port}/)`)

  setTimeout(async () => {
    get(`http://localhost:${port}/`)
  }, 1000)
})
