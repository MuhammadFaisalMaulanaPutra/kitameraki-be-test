import { afterEach, describe, expect, it } from 'vitest';

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:7071/api';
const organizationId = process.env.ORGANIZATION_ID ?? '00000000-0000-4000-8000-000000000001';
const headers = { 'X-Organization-Id': organizationId };
let taskId: string | undefined;

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
};

const expectSuccess = async (response: Response): Promise<unknown> => {
  const body = await readBody(response);
  expect(response.ok, JSON.stringify(body)).toBe(true);
  return body;
};

afterEach(async () => {
  if (!taskId) return;
  await fetch(`${baseUrl}/tasks/${taskId}`, { method: 'DELETE', headers });
  taskId = undefined;
});

describe('Docker Compose API smoke test', () => {
  it('registers GET, PUT, and OPTIONS for form settings without changing persisted data', async () => {
    const beforeResponse = await fetch(`${baseUrl}/form-settings`, { headers });
    const before = await expectSuccess(beforeResponse);
    const beforeEtag = beforeResponse.headers.get('etag');
    expect(beforeResponse.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(beforeResponse.headers.get('cache-control')).toBe('no-store');
    expect(beforeResponse.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(beforeResponse.headers.get('x-content-type-options')).toBe('nosniff');
    expect(beforeResponse.headers.get('x-frame-options')).toBe('DENY');
    expect(beforeResponse.headers.get('referrer-policy')).toBe('no-referrer');

    const optionsResponse = await fetch(`${baseUrl}/form-settings`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'PUT',
      },
    });
    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173',
    );

    const invalidPutResponse = await fetch(`${baseUrl}/form-settings`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'text/plain' },
      body: '{}',
    });
    expect(invalidPutResponse.status).toBe(415);
    expect(await readBody(invalidPutResponse)).toMatchObject({
      error: { code: 'unsupported_media_type' },
    });

    const afterResponse = await fetch(`${baseUrl}/form-settings`, { headers });
    expect(await expectSuccess(afterResponse)).toEqual(before);
    expect(afterResponse.headers.get('etag')).toBe(beforeEtag);
  });

  it('serves settings and completes the task lifecycle', async () => {
    const settingsResponse = await fetch(`${baseUrl}/form-settings`, { headers });
    const settings = await expectSuccess(settingsResponse);
    expect(settings).toMatchObject({ fields: expect.any(Array), rows: expect.any(Array) });

    const collectionOptions = await fetch(`${baseUrl}/tasks`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(collectionOptions.status).toBe(204);
    expect(collectionOptions.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173',
    );

    const createResponse = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Smoke task ${Date.now()}`,
        status: 'todo',
        tags: ['smoke'],
        customFields: {},
      }),
    });
    const created = (await expectSuccess(createResponse)) as Record<string, unknown>;
    taskId = String(created.id);
    expect(created).not.toHaveProperty('_rid');
    expect(created).not.toHaveProperty('_etag');

    const getResponse = await fetch(`${baseUrl}/tasks/${taskId}`, { headers });
    expect(await expectSuccess(getResponse)).toMatchObject({
      id: taskId,
      title: created.title,
      status: 'todo',
    });

    const itemOptions = await fetch(`${baseUrl}/tasks/${taskId}`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'PATCH',
      },
    });
    expect(itemOptions.status).toBe(204);
    expect(itemOptions.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');

    const updateResponse = await fetch(`${baseUrl}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    expect(await expectSuccess(updateResponse)).toMatchObject({ status: 'completed' });

    const listResponse = await fetch(
      `${baseUrl}/tasks?page=1&pageSize=10&q=${encodeURIComponent(String(created.title))}`,
      { headers },
    );
    expect(await expectSuccess(listResponse)).toMatchObject({
      items: [expect.objectContaining({ id: taskId })],
    });

    const deleteResponse = await fetch(`${baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
      headers,
    });
    expect(deleteResponse.status).toBe(204);
    taskId = undefined;
  });
});
