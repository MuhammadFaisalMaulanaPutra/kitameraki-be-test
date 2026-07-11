import { HttpResponseInit } from '@azure/functions';

/** Consistent JSON responses + error envelope across every function. */

export function ok(body: unknown): HttpResponseInit {
  return { status: 200, jsonBody: body };
}

export function created(body: unknown): HttpResponseInit {
  return { status: 201, jsonBody: body };
}

export function noContent(): HttpResponseInit {
  return { status: 204 };
}

export function failure(status: number, message: string, details?: unknown): HttpResponseInit {
  return { status, jsonBody: { error: { message, ...(details !== undefined ? { details } : {}) } } };
}
