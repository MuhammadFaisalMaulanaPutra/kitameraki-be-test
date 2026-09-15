import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { createOrganizationAuthorizer } from '../src/authorization';
import { AppError } from '../src/errors';
import { getTaskId, normalizeError, readJson, withHttpHandling } from '../src/http';

const organizationId = '00000000-0000-4000-8000-000000000001';
const runtime = {
  allowedOrigin: 'http://localhost:5173',
  authorizer: createOrganizationAuthorizer(organizationId),
  slowCosmosOperationMs: 250,
};

const createContext = () =>
  new InvocationContext({
    functionName: 'TestFunction',
    invocationId: '11111111-1111-4111-8111-111111111111',
  });

describe('HTTP boundary', () => {
  it('rejects requests without an organization header', async () => {
    const handler = withHttpHandling(async () => ({ status: 204 }), runtime);
    const response = await handler(
      new HttpRequest({ method: 'GET', url: 'http://localhost/api/tasks' }),
      createContext(),
    );

    expect(response).toMatchObject({
      status: 400,
      jsonBody: { error: { code: 'organization_required' } },
    });
  });

  it('rejects a different organization and accepts the configured organization', async () => {
    const handler = withHttpHandling(
      async (_request, _context, execution) => ({
        status: 200,
        jsonBody: { organizationId: execution.organizationId },
      }),
      runtime,
    );
    const forbidden = await handler(
      new HttpRequest({
        method: 'GET',
        url: 'http://localhost/api/tasks',
        headers: { 'X-Organization-Id': '11111111-1111-4111-8111-111111111111' },
      }),
      createContext(),
    );
    expect(forbidden).toMatchObject({
      status: 403,
      jsonBody: { error: { code: 'organization_forbidden' } },
    });

    const accepted = await handler(
      new HttpRequest({
        method: 'GET',
        url: 'http://localhost/api/tasks',
        headers: { 'X-Organization-Id': organizationId },
      }),
      createContext(),
    );
    expect(accepted).toMatchObject({ status: 200, jsonBody: { organizationId } });
  });

  it('handles preflight and explicitly organization-optional handlers', async () => {
    const implementation = vi.fn(async () => ({ status: 204 }));
    const handler = withHttpHandling(implementation, runtime);
    const preflight = await handler(
      new HttpRequest({ method: 'OPTIONS', url: 'http://localhost/api/tasks' }),
      createContext(),
    );
    expect(preflight.status).toBe(204);
    expect(implementation).not.toHaveBeenCalled();

    const optional = withHttpHandling(implementation, runtime, { requireOrganization: false });
    await expect(
      optional(
        new HttpRequest({ method: 'GET', url: 'http://localhost/api/tasks' }),
        createContext(),
      ),
    ).resolves.toMatchObject({ status: 204 });
  });

  it('adds strict CORS and security response headers', async () => {
    const handler = withHttpHandling(
      async () => ({ status: 200, jsonBody: { ok: true } }),
      runtime,
    );
    const response = await handler(
      new HttpRequest({
        method: 'GET',
        url: 'http://localhost/api/tasks',
        headers: {
          Origin: 'http://localhost:5173',
          'X-Organization-Id': organizationId,
        },
      }),
      createContext(),
    );

    expect(response.headers).toMatchObject({
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Expose-Headers': 'ETag,X-Request-Id',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
      'Referrer-Policy': 'no-referrer',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Request-Id': '11111111-1111-4111-8111-111111111111',
    });
  });

  it('does not reflect untrusted origins', async () => {
    const request = new HttpRequest({
      method: 'GET',
      url: 'http://localhost/api/tasks',
      headers: { Origin: 'https://attacker.example', 'X-Organization-Id': organizationId },
    });
    const strict = await withHttpHandling(async () => ({ status: 204 }), runtime)(
      request,
      createContext(),
    );
    expect(strict.headers).toMatchObject({ 'Access-Control-Allow-Origin': 'null' });
  });

  it('serializes safe application errors and preserves response headers', async () => {
    const context = createContext();
    const warning = vi.spyOn(context, 'warn');
    const handler = withHttpHandling(async () => {
      throw new AppError(
        400,
        'validation_error',
        'Safe message',
        { field: 'title' },
        {
          'X-Test': 'kept',
        },
      );
    }, runtime);
    const response = await handler(
      new HttpRequest({
        method: 'GET',
        url: 'http://localhost/api/tasks',
        headers: { 'X-Organization-Id': organizationId },
      }),
      context,
    );

    expect(response).toMatchObject({
      status: 400,
      jsonBody: {
        error: { code: 'validation_error', message: 'Safe message', details: { field: 'title' } },
      },
      headers: { 'X-Test': 'kept' },
    });
    expect(warning).toHaveBeenCalledWith('Request rejected', expect.any(Object));
  });

  it('sanitizes unexpected failures in both the response and structured logs', async () => {
    const context = createContext();
    const errorLog = vi.spyOn(context, 'error');
    const handler = withHttpHandling(async () => {
      throw new Error('secret connection string');
    }, runtime);
    const response = await handler(
      new HttpRequest({
        method: 'GET',
        url: 'http://localhost/api/tasks',
        headers: { 'X-Organization-Id': organizationId },
      }),
      context,
    );

    expect(response).toMatchObject({
      status: 500,
      jsonBody: { error: { code: 'internal_error', message: 'An unexpected error occurred.' } },
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('secret connection string');
  });

  it('rejects non-JSON request bodies', async () => {
    const request = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/api/tasks',
      headers: { 'Content-Type': 'text/plain' },
      body: { string: '{}' },
    });

    await expect(readJson(request, 1024)).rejects.toMatchObject({
      status: 415,
      code: 'unsupported_media_type',
    });
  });

  it('accepts JSON media types and parses the request body', async () => {
    const request = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/api/tasks',
      headers: { 'Content-Type': 'application/problem+json; charset=utf-8' },
      body: { string: '{"ok":true}' },
    });
    await expect(readJson(request, 1024)).resolves.toEqual({ ok: true });
  });

  it('rejects request bodies above the configured byte limit', async () => {
    const request = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/api/tasks',
      headers: { 'Content-Type': 'application/json' },
      body: { string: JSON.stringify({ value: 'x'.repeat(100) }) },
    });

    await expect(readJson(request, 32)).rejects.toMatchObject({
      status: 413,
      code: 'payload_too_large',
    });
  });

  it('rejects oversized Content-Length before reading and malformed JSON after reading', async () => {
    const oversized = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/api/tasks',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '1000' },
      body: { string: '{}' },
    });
    await expect(readJson(oversized, 100)).rejects.toMatchObject({ code: 'payload_too_large' });

    const malformed = new HttpRequest({
      method: 'POST',
      url: 'http://localhost/api/tasks',
      headers: { 'Content-Type': 'application/json' },
      body: { string: '{' },
    });
    await expect(readJson(malformed, 100)).rejects.toMatchObject({ code: 'invalid_json' });
  });

  it('validates route task IDs', () => {
    const valid = new HttpRequest({
      method: 'GET',
      url: `http://localhost/api/tasks/${organizationId}`,
      params: { id: organizationId },
    });
    expect(getTaskId(valid)).toBe(organizationId);

    const invalid = new HttpRequest({
      method: 'GET',
      url: 'http://localhost/api/tasks/not-a-uuid',
      params: { id: 'not-a-uuid' },
    });
    expect(() => getTaskId(invalid)).toThrow(/must be a UUID/);
  });

  it('maps Cosmos throttling without exposing internal errors', () => {
    expect(normalizeError({ code: 429, retryAfterInMs: 1500 })).toMatchObject({
      status: 503,
      code: 'database_throttled',
      headers: { 'Retry-After': '2' },
    });
  });

  it('normalizes application, configuration, transient, conflict, and unknown errors', () => {
    const application = new AppError(404, 'task_not_found', 'Task not found.');
    expect(normalizeError(application)).toBe(application);

    let zodError: unknown;
    try {
      z.uuid().parse('invalid');
    } catch (error) {
      zodError = error;
    }
    expect(normalizeError(zodError)).toMatchObject({ status: 500, code: 'configuration_error' });
    expect(normalizeError({ statusCode: 503 })).toMatchObject({
      status: 503,
      code: 'database_unavailable',
    });
    expect(normalizeError({ code: 409 })).toMatchObject({
      status: 409,
      code: 'database_conflict',
    });
    expect(normalizeError('unknown')).toMatchObject({ status: 500, code: 'internal_error' });
  });
});
