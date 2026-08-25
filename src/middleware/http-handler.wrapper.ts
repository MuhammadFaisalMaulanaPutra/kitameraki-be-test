import { AppError } from '@/errors/app-error'
import { logger } from '@/utils/logger'
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'

export type AsyncHttpHandler = (
  request: HttpRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>

export function httpHandler(handler: AsyncHttpHandler): AsyncHttpHandler {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error: unknown) {
      const instance = new URL(request.url).pathname

      if (error instanceof AppError) {
        logger.warn(`Operational error: ${error.message}`, {
          errorCode: error.errorCode,
          details: error.details
        })
        return {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/problem+json' },
          jsonBody: {
            success: false,
            title: error.message,
            status: error.statusCode,
            code: error.errorCode,
            detail: error.message,
            invalidParams: Array.isArray(error.details)
              ? error.details.filter((item) => item !== null && typeof item === 'object')
              : undefined,
            instance,
            timestamp: new Date().toISOString()
          }
        }
      }

      context.error('Unhandled system exception', error)
      return {
        status: 500,
        headers: { 'Content-Type': 'application/problem+json' },
        jsonBody: {
          success: false,
          title: 'Internal Server Error',
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          instance,
          timestamp: new Date().toISOString()
        }
      }
    }
  }
}
