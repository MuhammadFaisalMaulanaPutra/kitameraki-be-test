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
      if (error instanceof AppError) {
        logger.warn(`Operational error: ${error.message}`, {
          errorCode: error.errorCode,
          details: error.details
        })

        return {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/problem+json' },
          jsonBody: {
            message: error.message,
            data: Array.isArray(error.details)
              ? error.details.filter((item) => item !== null && typeof item === 'object')
              : undefined
          }
        }
      }

      context.error('Unhandled system exception', error)
      return {
        status: 500,
        headers: { 'Content-Type': 'application/problem+json' },
        jsonBody: {
          message: 'Internal Server Error',
          data: undefined
        }
      }
    }
  }
}
