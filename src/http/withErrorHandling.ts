import { HttpHandler } from '@azure/functions';
import { ZodError } from 'zod';
import { isCosmosNotFound } from '../cosmos/errors';
import { failure } from './respond';

/**
 * A thrown `HttpError` becomes the matching HTTP response — lets handlers signal
 * e.g. a 404 with a `throw new HttpError(404, ...)` instead of plumbing status
 * codes through return values.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Wraps a handler with centralised error handling so no function returns 200 on
 * failure (as the original code did) and no stack trace ever leaks to the client.
 */
export function withErrorHandling(handler: HttpHandler): HttpHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      context.error(error);

      if (error instanceof HttpError) {
        return failure(error.status, error.message, error.details);
      }
      if (error instanceof ZodError) {
        return failure(400, 'Validation failed', error.flatten());
      }
      if (isCosmosNotFound(error)) {
        return failure(404, 'Resource not found');
      }
      return failure(500, 'Internal server error');
    }
  };
}
