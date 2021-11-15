/**
 * This file will be served in you run "npm start".
 */

import { get } from 'http'
import { express } from './lib/express.js'

const app = express()

app.use((req, res, next) => {
  console.log('use()')
  return next()
})

app.all('/', (req, res, next) => {
  console.log("all '/'")
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

app.listen(3000, () => {
  console.log('listen on port 3000')

  setTimeout(async () => {
    get('http://localhost:3000/')
  }, 1000)
})
