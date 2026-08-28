import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAppConfig } from '../config/appConfig';
import { AppError, ValidationError } from '../errors/AppError';
import { validateIdentifier } from '../validation/common';

export type HttpHandler = (
  request: HttpRequest,
  context: InvocationContext,
) => Promise<HttpResponseInit>;

export function withErrorHandling(handler: HttpHandler): HttpHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          status: error.statusCode,
          jsonBody: {
            success: false,
            message: error.message,
            errors: error.issues,
          },
        };
      }

      if (error instanceof AppError) {
        return {
          status: error.statusCode,
          jsonBody: {
            success: false,
            message: error.message,
          },
        };
      }

      const safeError = error instanceof Error ? error : new Error('Unknown error');
      context.error('Unhandled application error', {
        name: safeError.name,
        message: safeError.message,
        stack: safeError.stack,
      });

      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'An unexpected error occurred.',
        },
      };
    }
  };
}

export function success(data: unknown, status = 200): HttpResponseInit {
  return {
    status,
    jsonBody: {
      success: true,
      data,
    },
  };
}

export function successWithoutData(status = 200): HttpResponseInit {
  return {
    status,
    jsonBody: {
      success: true,
    },
  };
}

export async function readJsonBody(request: HttpRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError([{ field: 'body', message: 'Request body must contain valid JSON.' }]);
  }
}

export function resolveOrganizationId(request: HttpRequest, bodyOrganizationId?: string): string {
  const configuredOrganizationId = getAppConfig().defaultOrganizationId;
  const queryOrganizationId = request.query.get('organizationId')?.trim();
  // In the single-organization technical-test scope, server configuration wins over client input.
  // Until authentication exists, organizationId must not be treated as a real authorization boundary.
  const resolved = configuredOrganizationId || queryOrganizationId || bodyOrganizationId;

  if (!resolved) {
    throw new ValidationError([
      {
        field: 'organizationId',
        message: 'organizationId is required as a query parameter, create-body field, or DEFAULT_ORGANIZATION_ID.',
      },
    ]);
  }

  return validateIdentifier(resolved, 'organizationId');
}

export function resolveTaskId(request: HttpRequest): string {
  const raw = request.params.id ?? request.query.get('id');
  if (!raw) {
    throw new ValidationError([{ field: 'id', message: 'Task id is required.' }]);
  }
  return validateIdentifier(raw, 'id');
}
