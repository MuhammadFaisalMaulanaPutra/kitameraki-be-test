import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AppError } from './errors';

export function jsonResponse(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: { 'content-type': 'application/json' }
  };
}

export function errorResponse(error: unknown, context: InvocationContext): HttpResponseInit {
  if (error instanceof AppError) {
    return jsonResponse(error.statusCode, {
      error: { code: error.code, message: error.message }
    });
  }

  context.error(error);
  return jsonResponse(500, {
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' }
  });
}

export async function readJsonBody(request: HttpRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError('Request body must be valid JSON', 400, 'INVALID_JSON');
  }
}
