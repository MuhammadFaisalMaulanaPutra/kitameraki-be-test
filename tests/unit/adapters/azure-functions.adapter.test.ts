import type { HttpRequest, InvocationContext } from '@azure/functions';
import express from 'express';
import { createAzureHttpHandler } from '../../../src/adapters/azure-functions.adapter';

function createExpressApp() {
  const app = express();
  app.use(express.json());
  app.get('/api/echo', (req, res) => {
    res.json({ query: req.query, org: req.header('x-organization-id') });
  });
  app.post('/api/echo', (req, res) => {
    res.status(201).set('Location', '/api/echo/1').json({ body: req.body });
  });
  app.delete('/api/echo', (_req, res) => {
    res.status(204).end();
  });
  return app;
}

function azureRequest(method: string, url: string, body?: unknown): HttpRequest {
  const headers = new Headers({ 'x-organization-id': 'org-1' });
  if (body !== undefined) headers.set('content-type', 'application/json');
  return {
    method,
    url,
    headers,
    arrayBuffer: async () => new TextEncoder().encode(body === undefined ? '' : JSON.stringify(body)).buffer,
  } as unknown as HttpRequest;
}

describe('createAzureHttpHandler', () => {
  const handler = createAzureHttpHandler(async () => createExpressApp());
  const context = {} as InvocationContext;

  it('forwards method, path, query string and headers to Express', async () => {
    const response = await handler(azureRequest('GET', 'https://func.azurewebsites.net/api/echo?page=2'), context);

    expect(response.status).toBe(200);
    expect(JSON.parse(Buffer.from(response.body as Buffer).toString())).toEqual({ query: { page: '2' }, org: 'org-1' });
  });

  it('forwards the JSON body and response headers', async () => {
    const response = await handler(
      azureRequest('POST', 'https://func.azurewebsites.net/api/echo', { title: 'x' }),
      context,
    );

    expect(response.status).toBe(201);
    expect(response.headers).toMatchObject({ location: '/api/echo/1' });
    expect(JSON.parse(Buffer.from(response.body as Buffer).toString())).toEqual({ body: { title: 'x' } });
  });

  it('returns no body for 204 responses', async () => {
    const response = await handler(azureRequest('DELETE', 'https://func.azurewebsites.net/api/echo'), context);

    expect(response.status).toBe(204);
    expect(response.body).toBeUndefined();
  });
});
