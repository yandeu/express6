<div align="center">

<a href="http://expressjs.com/"><img alt="express6 logo" width="480" src="readme/logo.jpg"></a>

Modern, fast, unopinionated, minimalist web framework for [node](http://nodejs.org).

[![Github Workflow](https://img.shields.io/github/workflow/status/yandeu/express6/CI/main?label=build&logo=github&style=flat-square)](https://github.com/yandeu/express6/actions?query=workflow%3ACI)
[![Github Workflow](https://img.shields.io/github/workflow/status/yandeu/express6/CodeQL/main?label=CodeQL&logo=github&style=flat-square)](https://github.com/yandeu/express6/actions?query=workflow%3ACodeQL)
[![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/yandeu/express6?label=snyk%20vulnerabilities&logo=snyk&style=flat-square)](https://github.com/yandeu/express6/actions/workflows/snyk.yml)
![Node version](https://img.shields.io/node/v/@geckos.io/server.svg?style=flat-square)
[![Codecov](https://img.shields.io/codecov/c/github/yandeu/express6?logo=codecov&style=flat-square)](https://codecov.io/gh/yandeu/express6)
[![Sponsors](https://img.shields.io/github/sponsors/yandeu?style=flat-square)](https://github.com/sponsors/yandeu)
[![CodeStyle Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

</div>

---

```ts
// npm install express6

import { express } from 'express'
const app = express()

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(3000)
```

## What?

- Clone of [express.js v4.17.1](https://github.com/expressjs/express) ([master branch from Aug 14, 2021]([https://github.com/expressjs/express/commits/master))
- Converted to TypeScript
- Updated all dependencies
- Manually merged [branch 5](https://github.com/expressjs/express/tree/5.0) (except new router)

## Why?

I love express and would love to see people using it for at least another 10 years!

## What about "Unhandled Promise Rejection"?

This has been take care of 👍

## ESModules?

It is ready to be exported as esm, but express6 v1 is all about compatibility with express v4, therefore express6 is ships as commonjs.

## New

I added `req.URL`, a short-hand getter for <code>new URL(this.req, \`http://${req.headers.host}\`)</code>.

## Types

The types are simpler and a bit different than in express v4. For example, all 3 `app.use()` below are valid, but express6 throws a type error on the third `app.use()`. In the example below, I recommend using the [spread operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax).

### Middleware with TypeScript

```ts
// some middleware
const midi = (req, res, next) => next()

app.get('/', ...[midi, midi], (req, res) => {})
app.get('/', midi, midi, (req, res) => {})
// @ts-ignore
app.get('/', [midi, midi], (req, res) => {})
```

### Error routes with TypeScript

```ts
import type { Request, Response, NextFunction } from 'express6'

// @ts-ignore
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.log('ERROR:', err)
  return res.send(err)
})
```

## Todo

- improve types
- remove all `@ts-ignore`
- stricten `tsconfig`

_Make a [PR](https://github.com/yandeu/express6/pulls)!_

## Breaking Changes?

Yes, same as [Express v5](https://expressjs.com/en/guide/migrating-5.html).

## Everything Else?

Same as [expressjs](https://github.com/expressjs/express).
