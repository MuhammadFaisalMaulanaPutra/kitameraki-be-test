import { HttpResponseInit } from '@azure/functions';

export class AppError extends Error {
  constructor(public message: string, public status: number = 400) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export function ok(data: unknown): HttpResponseInit {
  return { jsonBody: { data }, status: 200 };
}

export function created(data: unknown): HttpResponseInit {
  return { jsonBody: { data }, status: 201 };
}

export function errorResponse(err: unknown): HttpResponseInit {
  if (err instanceof AppError) {
    return { jsonBody: { error: err.message }, status: err.status };
  }
  console.error(err);
  return { jsonBody: { error: 'Internal server error' }, status: 500 };
}
