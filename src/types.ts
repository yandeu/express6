import type { req } from './request.js'
import type { res } from './response.js'

export type { Route } from './router/route.js'

export type Request = typeof req
export type Response = typeof res

export interface NextFunction {
  (err?: any): void
  /**
   * "Break-out" of a router by calling {next('router')};
   * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.router}
   */
  (deferToNext: 'router'): void
  /**
   * "Break-out" of a route by calling {next('route')};
   * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.application}
   */
  (deferToNext: 'route'): void
}

export interface RequestHandler {
  (req: Request, res: Response, next: NextFunction): void
}

export type RESTFunction = (path: string, ...handlers: RequestHandler[]) => void
export type GetSettings = (options: string) => any
