import type { RequestListener } from 'node:http';
import type { HttpHandler, HttpRequest, HttpResponseInit } from '@azure/functions';
import { inject, type InjectOptions } from 'light-my-request';

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD', 'OPTIONS']);

function toResponseHeaders(headers: Record<string, string | string[] | number | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : String(value)]),
  );
}

/**
 * Bridges an Azure Functions (v4 programming model) HTTP trigger to the Express application,
 * so the exact same routes, validation and error handling run locally and on Azure Function App.
 */
export function createAzureHttpHandler(getApp: () => Promise<RequestListener>): HttpHandler {
  return async (request: HttpRequest): Promise<HttpResponseInit> => {
    const app = await getApp();
    const url = new URL(request.url);
    const payload = METHODS_WITHOUT_BODY.has(request.method) ? undefined : Buffer.from(await request.arrayBuffer());

    const response = await inject(app, {
      method: request.method as InjectOptions['method'],
      url: `${url.pathname}${url.search}`,
      headers: Object.fromEntries(request.headers.entries()),
      payload,
    });

    return {
      status: response.statusCode,
      headers: toResponseHeaders(response.headers),
      body: response.statusCode === 204 ? undefined : response.rawPayload,
    };
  };
}
