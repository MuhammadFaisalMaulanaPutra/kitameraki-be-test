import request from 'supertest';
import { createTemplateRows } from '../../src/models/form-settings.model';
import {
  attachmentsField,
  checklistList,
  clientGroup,
  reviewerEmailField,
  startDateField,
  summaryExpression,
  templateWithCustomRows,
} from '../helpers/form-fixtures';
import { ORG_ID, OTHER_ORG_ID, type TestContext, createTestApp } from '../helpers/test-app';

const ORG_HEADER = 'x-organization-id';

const statusWithReview = {
  id: 'field_status',
  type: 'select',
  key: 'status',
  label: 'Progress',
  required: true,
  defaultValue: 'todo',
  options: [
    { label: 'To Do', value: 'todo' },
    { label: 'In Review', value: 'in-review' },
    { label: 'Done', value: 'completed' },
  ],
};

describe('Form Settings API', () => {
  let ctx: TestContext;
  const get = (org = ORG_ID) => request(ctx.app).get('/api/form-settings').set(ORG_HEADER, org);
  const put = (body: object) => request(ctx.app).put('/api/form-settings').set(ORG_HEADER, ORG_ID).send(body);

  beforeEach(() => {
    ctx = createTestApp();
  });

  it('200 - returns the task template when nothing has been saved', async () => {
    const response = await get().expect(200);

    expect(response.body.data).toEqual({
      id: 'task-form',
      organizationId: ORG_ID,
      schemaVersion: 3,
      rows: createTemplateRows(),
      updatedAt: null,
    });
    expect(response.body.data.rows.at(-1).fields.map((field: { action: string }) => field.action)).toEqual([
      'submit',
      'reset',
    ]);
  });

  it('200 - saves and returns the settings', async () => {
    const rows = templateWithCustomRows([reviewerEmailField, startDateField]);

    const saved = await put({ rows }).expect(200);

    expect(saved.body.message).toBe('Form settings saved successfully');
    expect(saved.body.data.rows).toEqual(rows);
    expect(saved.body.data.updatedAt).toEqual(expect.any(String));
    const fetched = await get().expect(200);
    expect(fetched.body.data).toEqual(saved.body.data);
  });

  it('200 - saves a v3 form with containers, expressions, file pickers and a version tag', async () => {
    const rows = templateWithCustomRows(
      [clientGroup],
      [checklistList],
      [attachmentsField, summaryExpression],
      [
        {
          id: 'field_notice',
          type: 'html',
          content: '<p>{{ title }}</p>',
          conditional: { hide: '=empty(title)' },
          layout: { columns: 10 },
        },
      ],
    );

    const saved = await put({ rows, versionTag: 'release-3' }).expect(200);

    expect(saved.body.data).toMatchObject({ schemaVersion: 3, versionTag: 'release-3', rows });
  });

  it('200 - template fields can be removed, renamed and their options edited', async () => {
    const rows = [
      {
        id: 'row_title',
        fields: [{ id: 'field_title', type: 'text', key: 'title', label: 'Task Name', required: true }],
      },
      { id: 'row_status', fields: [statusWithReview] },
    ];

    const saved = await put({ rows }).expect(200);

    expect(saved.body.data.rows).toEqual(rows);
  });

  it('settings are isolated per organization', async () => {
    await put({ rows: [] }).expect(200);

    const other = await get(OTHER_ORG_ID).expect(200);
    expect(other.body.data.rows).toEqual(createTemplateRows());
  });

  it('422 - rejects a row with more than two columns', async () => {
    const field = (id: string) => ({ id, key: id, label: id, type: 'text' });

    const response = await put({ rows: [{ id: 'row_1', fields: [field('a'), field('b'), field('c')] }] }).expect(422);

    expect(response.body.error.details).toEqual([
      { field: 'rows.0.fields', message: 'A row can contain at most 2 fields' },
    ]);
  });

  it('422 - rejects a select without options and an incompatible core key', async () => {
    const response = await put({
      rows: [
        { id: 'r1', fields: [{ id: 'a', type: 'select', key: 'priority', label: 'Priority', options: [] }] },
        { id: 'r2', fields: [{ id: 'b', type: 'number', key: 'title', label: 'Title' }] },
      ],
    }).expect(422);

    expect(response.body.error.details).toEqual([
      { field: 'rows.0.fields.0.options', message: 'Add at least one option' },
      { field: 'rows.1.fields.0.type', message: 'Key "title" can only be used by: text, textarea' },
    ]);
  });

  it('422 - points nested issues into the component tree', async () => {
    const response = await put({
      rows: [
        {
          id: 'r1',
          fields: [
            {
              ...checklistList,
              rows: [
                { id: 'r2', fields: [{ id: 'f_status', type: 'select', key: 'status', label: 'S', options: [] }] },
              ],
            },
          ],
        },
      ],
    }).expect(422);

    expect(response.body.error.details).toEqual([
      {
        field: 'rows.0.fields.0.rows.0.fields.0.key',
        message: 'Key "status" is bound to the task and cannot be used inside a group with a path or a dynamic list',
      },
      { field: 'rows.0.fields.0.rows.0.fields.0.options', message: 'Add at least one option' },
    ]);
  });

  it('422 - requires rows', async () => {
    const response = await put({}).expect(422);
    expect(response.body.error.details).toEqual([{ field: 'rows', message: expect.any(String) }]);
  });

  it('400 - requires a valid organization header', async () => {
    await get('abc').expect(400);
  });
});

describe('Tasks follow the form settings', () => {
  it('validates status against the edited options and stores custom values by key', async () => {
    const ctx = createTestApp();
    const rows = [
      {
        id: 'row_title',
        fields: [{ id: 'field_title', type: 'text', key: 'title', label: 'Task Name', required: true }],
      },
      { id: 'row_status', fields: [statusWithReview, reviewerEmailField] },
    ];
    await request(ctx.app).put('/api/form-settings').set(ORG_HEADER, ORG_ID).send({ rows }).expect(200);
    const post = (body: object) => request(ctx.app).post('/api/tasks').set(ORG_HEADER, ORG_ID).send(body);

    const invalid = await post({ title: 'x', status: 'todo', priority: 'high' }).expect(422);
    expect(invalid.body.error.details).toEqual([
      { field: 'priority', message: 'Field is not part of the task form' },
      { field: 'customFields.reviewerEmail', message: 'Reviewer is required' },
    ]);

    const created = await post({
      title: 'x',
      status: 'in-review',
      customFields: { reviewerEmail: 'qa@example.com' },
    }).expect(201);
    expect(created.body.data).toMatchObject({ status: 'in-review', customFields: { reviewerEmail: 'qa@example.com' } });
  });

  it('validates the nested values of groups with a path and dynamic lists', async () => {
    const ctx = createTestApp();
    await request(ctx.app)
      .put('/api/form-settings')
      .set(ORG_HEADER, ORG_ID)
      .send({ rows: templateWithCustomRows([clientGroup], [checklistList]) })
      .expect(200);
    const post = (body: object) => request(ctx.app).post('/api/tasks').set(ORG_HEADER, ORG_ID).send(body);

    const invalid = await post({
      title: 'x',
      customFields: { client: { name: 'Acme', tier: 'platinum' }, checklist: [{ item: 'Slides' }, { done: true }] },
    }).expect(422);
    expect(invalid.body.error.details).toEqual([
      { field: 'customFields.client.tier', message: 'Tier: Must be one of: standard, gold' },
      { field: 'customFields.checklist.1.item', message: 'Item is required' },
    ]);

    const created = await post({
      title: 'x',
      customFields: { client: { name: 'Acme' }, checklist: [{ item: 'Slides', done: true }] },
    }).expect(201);
    expect(created.body.data.customFields).toEqual({
      client: { name: 'Acme', tier: 'standard' },
      checklist: [{ item: 'Slides', done: true }],
    });
  });
});

describe('Misc routes', () => {
  it('GET /api/health - 200', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('GET /api/docs.json - serves the OpenAPI document', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/docs.json').expect(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/tasks',
        '/tasks/{id}',
        '/tasks/bulk-delete',
        '/form-settings',
        '/files',
        '/files/{id}',
      ]),
    );
  });

  it('unknown route - 404', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/unknown').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('applies security headers and CORS', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:3000').expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not allow unknown CORS origins', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/health').set('Origin', 'http://evil.example').expect(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('429 - rate limits excessive requests', async () => {
    const { app } = createTestApp({ rateLimit: { windowMs: 60_000, max: 2 } });
    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/health').expect(200);
    const response = await request(app).get('/api/health').expect(429);
    expect(response.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('413 - rejects oversized payloads', async () => {
    const { app } = createTestApp({ jsonBodyLimit: '1kb' });
    const response = await request(app)
      .post('/api/tasks')
      .set(ORG_HEADER, ORG_ID)
      .send({ title: 'x', description: 'y'.repeat(2_000) })
      .expect(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
