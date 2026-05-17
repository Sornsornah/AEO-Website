import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<Response>

export function withLogging(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const start = Date.now()
    const requestId = crypto.randomUUID()
    try {
      const response = await handler(req, ctx)
      logger.info({
        method: req.method,
        path: new URL(req.url).pathname,
        status: response.status,
        duration_ms: Date.now() - start,
        requestId,
      })
      return response
    } catch (error) {
      logger.error({ error, requestId })
      throw error
    }
  }
}
