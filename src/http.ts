import type {
  HttpHandler as AzureHttpHandler,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { ZodError, z } from 'zod';
import { AppError, mapCosmosError } from './errors';
import { createRequestTelemetry } from './telemetry';
import type { OrganizationAuthorizer } from './authorization';
import type { RequestTelemetry } from './telemetry';

export interface HttpExecutionContext {
  organizationId?: string;
  telemetry: RequestTelemetry;
}

export interface HttpRuntime {
  allowedOrigin: string;
  authorizer: OrganizationAuthorizer;
  slowCosmosOperationMs: number;
}

export type ApplicationHttpHandler = (
  request: HttpRequest,
  context: InvocationContext,
  execution: HttpExecutionContext,
) => Promise<HttpResponseInit>;

interface HandlerOptions {
  requireOrganization?: boolean;
}

export const withHttpHandling =
  (
    handler: ApplicationHttpHandler,
    runtime: HttpRuntime,
    options: HandlerOptions = { requireOrganization: true },
  ): AzureHttpHandler =>
  async (request, context) => {
    const startedAt = performance.now();
    const telemetry = createRequestTelemetry();
    let response: HttpResponseInit;

    try {
      if (request.method === 'OPTIONS') {
        response = { status: 204 };
      } else {
        const organizationId =
          options.requireOrganization === false
            ? undefined
            : runtime.authorizer.authorize(request.headers.get('x-organization-id'));
        response = await handler(request, context, { organizationId, telemetry });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      response = {
        status: normalized.status,
        jsonBody: {
          error: {
            code: normalized.code,
            message: normalized.message,
            details: normalized.details,
          },
        },
        headers: normalized.headers,
      };
      if (normalized.status >= 500) {
        context.error('Request failed', {
          code: normalized.code,
          errorType: error instanceof Error ? error.name : typeof error,
          invocationId: context.invocationId,
        });
      } else {
        context.warn('Request rejected', {
          code: normalized.code,
          invocationId: context.invocationId,
        });
      }
    }

    const snapshot = telemetry.snapshot();
    for (const operation of snapshot.operations.filter(
      (metric) => metric.durationMs >= runtime.slowCosmosOperationMs,
    )) {
      context.warn('Slow Cosmos DB operation', {
        activityId: operation.activityId,
        container: operation.container,
        durationMs: Math.round(operation.durationMs),
        invocationId: context.invocationId,
        operation: operation.operation,
      });
    }
    context.log('Request completed', {
      cosmosOperationCount: snapshot.cosmosOperationCount,
      cosmosRequestCharge: Number(snapshot.cosmosRequestCharge.toFixed(2)),
      durationMs: Math.round(performance.now() - startedAt),
      functionName: context.functionName,
      invocationId: context.invocationId,
      method: request.method,
      status: response.status ?? 200,
    });

    return applyResponseHeaders(request, response, runtime.allowedOrigin, context.invocationId);
  };

export const getTaskId = (request: HttpRequest): string => {
  const result = z.uuid().safeParse(request.params.id);
  if (!result.success) throw new AppError(400, 'validation_error', 'Task ID must be a UUID.');
  return result.data;
};

export const readJson = async (request: HttpRequest, maxBytes: number): Promise<unknown> => {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (!contentType || (contentType !== 'application/json' && !contentType.endsWith('+json'))) {
    throw new AppError(415, 'unsupported_media_type', 'Content-Type must be application/json.');
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new AppError(413, 'payload_too_large', `Request body cannot exceed ${maxBytes} bytes.`);
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new AppError(413, 'payload_too_large', `Request body cannot exceed ${maxBytes} bytes.`);
  }

  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new AppError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
};

export const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) {
    return new AppError(500, 'configuration_error', 'The service is not configured correctly.');
  }
  return (
    mapCosmosError(error) ?? new AppError(500, 'internal_error', 'An unexpected error occurred.')
  );
};

const applyResponseHeaders = (
  request: HttpRequest,
  response: HttpResponseInit,
  allowedOrigin: string,
  requestId: string,
): HttpResponseInit => ({
  ...response,
  headers: {
    ...(response.headers as Record<string, string> | undefined),
    ...corsHeaders(request, allowedOrigin),
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Request-Id': requestId,
    ...(response.jsonBody === undefined
      ? {}
      : { 'Content-Type': 'application/json; charset=utf-8' }),
  },
});

const corsHeaders = (request: HttpRequest, allowedOrigin: string): Record<string, string> => {
  const origin = request.headers.get('origin');
  const allowOrigin = origin === allowedOrigin || !origin ? allowedOrigin : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Organization-Id,If-Match',
    'Access-Control-Expose-Headers': 'ETag,X-Request-Id',
    Vary: 'Origin',
  };
};
