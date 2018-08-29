import { Context, Middleware } from "koa";
import { IncomingMessage, ServerResponse } from "http";

type ConnectMiddlewareNoCallback = (req: any, res: any) => any;
type ConnectMiddlewareWithCallback = (req: any, res: any, callback: (...args: any[]) => any) => any;
type ConnectMiddleware = ConnectMiddlewareNoCallback | ConnectMiddlewareWithCallback

/**
 * If the middleware function does declare receiving the `next` callback
 * assume that it's synchronous and invoke `next` ourselves
 */
function noCallbackHandler(ctx: Context, connectMiddleware: ConnectMiddlewareNoCallback, next: () => Promise<any>) {
  connectMiddleware(ctx.req, ctx.res)
  return next()
}

/**
 * The middleware function does include the `next` callback so only resolve
 * the Promise when it's called. If it's never called, the middleware stack
 * completion will stall
 */
function withCallbackHandler(ctx: Context, connectMiddleware: ConnectMiddlewareWithCallback, next: () => Promise<any>) {
  return new Promise((resolve, reject) => {
    connectMiddleware(ctx.req, ctx.res, (err?: any) => {
      if (err) reject(err)
      else resolve(next())
    })
  })
}

function hasNoCallback(middleware: ConnectMiddleware): middleware is ConnectMiddlewareNoCallback {
  return middleware.length < 3;
}

/**
 * Returns a Koa middleware function that varies its async logic based on if the
 * given middleware function declares at least 3 parameters, i.e. includes
 * the `next` callback function
 */
function koaConnect(connectMiddleware: ConnectMiddleware): Middleware {
  return function koaConnect(ctx: Context, next: () => Promise<any>) {
    return hasNoCallback(connectMiddleware)
      ? noCallbackHandler(ctx, connectMiddleware, next)
      : withCallbackHandler(ctx, connectMiddleware, next);
  }
}
export = koaConnect;