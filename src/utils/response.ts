import { HttpResponseInit } from '@azure/functions';

export function successResponse<T>(data: T, status: number = 200): HttpResponseInit {
  return {
    status,
    jsonBody: data,
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

export function errorResponse(message: string, status: number = 400): HttpResponseInit {
  return {
    status,
    jsonBody: { error: message },
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

export function notFoundResponse(resource: string = 'Resource'): HttpResponseInit {
  return errorResponse(`${resource} not found`, 404);
}

export function internalErrorResponse(message: string = 'Internal server error'): HttpResponseInit {
  return errorResponse(message, 500);
}
