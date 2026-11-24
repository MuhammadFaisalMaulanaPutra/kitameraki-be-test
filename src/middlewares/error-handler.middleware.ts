import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

interface BodyParserError {
  type: string;
  status?: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return typeof error === 'object' && error !== null && typeof (error as BodyParserError).type === 'string';
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

/**
 * Central error handler. Known errors are mapped to their HTTP status; anything else becomes a
 * generic 500 so stack traces and database details are never exposed to the client.
 */
// Express recognizes error handlers by their 4-argument signature, so `_next` must stay.
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.parse.failed') {
      sendError(res, 400, 'INVALID_JSON', 'Request body contains invalid JSON');
      return;
    }
    if (error.type === 'entity.too.large') {
      sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
      return;
    }
    if (error.status && error.status >= 400 && error.status < 500) {
      sendError(res, error.status, 'BAD_REQUEST', 'Malformed request body');
      return;
    }
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred. Please try again later.');
}
