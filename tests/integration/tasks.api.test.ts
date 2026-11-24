import request from 'supertest';
import type { ITaskRepository } from '../../src/interfaces/task.repository.interface';
import {
  attachmentsField,
  checklistList,
  clientGroup,
  reviewerEmailField,
  summaryExpression,
  templateWithCustomRows,
} from '../helpers/form-fixtures';
import { MISSING_ID, ORG_ID, OTHER_ORG_ID, type TestContext, createTestApp } from '../helpers/test-app';

const ORG_HEADER = 'x-organization-id';

describe('Tasks API', () => {
  let ctx: TestContext;

  const api = () => ({
    get: (url: string) => request(ctx.app).get(url).set(ORG_HEADER, ORG_ID),
    post: (url: string, body?: object | string) => request(ctx.app).post(url).set(ORG_HEADER, ORG_ID).send(body),
    put: (url: string, body?: object) => request(ctx.app).put(url).set(ORG_HEADER, ORG_ID).send(body),
    patch: (url: string, body?: object) => request(ctx.app).patch(url).set(ORG_HEADER, ORG_ID).send(body),
    delete: (url: string) => request(ctx.app).delete(url).set(ORG_HEADER, ORG_ID),
  });

  const createTask = async (body: object = { title: 'Task' }) =>
    (await api().post('/api/tasks', body).expect(201)).body.data;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('POST /api/tasks', () => {
    it('201 - creates a task and returns its location', async () => {
      const response = await api()
        .post('/api/tasks', {
          title: 'Write report',
          description: 'Quarterly report',
          dueDate: '2026-12-01T09:00:00.000Z',
          priority: 'high',
          tags: ['finance'],
        })
        .expect(201);

      expect(response.headers.location).toBe(`/api/tasks/${response.body.data.id}`);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Task created successfully',
        data: {
          organizationId: ORG_ID,
          title: 'Write report',
          status: 'todo',
          priority: 'high',
          tags: ['finance'],
          customFields: {},
        },
      });
    });

    it('422 - returns every validation error', async () => {
      const response = await api().post('/api/tasks', { title: '', priority: 'urgent' }).expect(422);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        error: {
          code: 'VALIDATION_ERROR',
          details: [
            { field: 'title', message: 'Title is required' },
            { field: 'priority', message: 'Priority: Must be one of: low, medium, high' },
          ],
        },
      });
    });

    it('422 - blocks mass assignment of server managed fields', async () => {
      const response = await api().post('/api/tasks', { title: 'x', organizationId: OTHER_ORG_ID }).expect(422);
      expect(response.body.error.details).toEqual([
        { field: 'organizationId', message: 'Unknown field is not allowed' },
      ]);
    });

    it('400 - rejects malformed JSON', async () => {
      const response = await request(ctx.app)
        .post('/api/tasks')
        .set(ORG_HEADER, ORG_ID)
        .set('Content-Type', 'application/json')
        .send('{"title": ')
        .expect(400);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('400 - rejects a non-object body', async () => {
      const response = await request(ctx.app)
        .post('/api/tasks')
        .set(ORG_HEADER, ORG_ID)
        .set('Content-Type', 'application/json')
        .send('["a"]')
        .expect(400);
      expect(response.body.message).toBe('Request body must be a JSON object');
    });

    it('400 - requires the organization header', async () => {
      const response = await request(ctx.app).post('/api/tasks').send({ title: 'x' }).expect(400);
      expect(response.body.message).toBe('Missing required "x-organization-id" header');
    });

    it('422 - validates custom fields against the saved form settings', async () => {
      await api()
        .put('/api/form-settings', {
          rows: templateWithCustomRows([reviewerEmailField]),
        })
        .expect(200);

      const invalid = await api()
        .post('/api/tasks', { title: 'x', customFields: { reviewerEmail: 'nope' } })
        .expect(422);
      expect(invalid.body.error.details).toEqual([
        { field: 'customFields.reviewerEmail', message: 'Reviewer: Must be a valid email address' },
      ]);

      const valid = await api().post('/api/tasks', { title: 'x', customFields: { reviewerEmail: 'qa@example.com' } });
      expect(valid.status).toBe(201);
      expect(valid.body.data.customFields).toEqual({ reviewerEmail: 'qa@example.com' });
    });
  });

  describe('nested values (groups, dynamic lists, files, expressions)', () => {
    beforeEach(async () => {
      await api()
        .put('/api/form-settings', {
          rows: templateWithCustomRows([clientGroup], [checklistList], [attachmentsField, summaryExpression]),
        })
        .expect(200);
    });

    it('201 - stores nested objects, lists of objects, file references and expression results', async () => {
      const upload = await request(ctx.app)
        .post('/api/files')
        .set(ORG_HEADER, ORG_ID)
        .attach('file', Buffer.from('%PDF-1.4'), { filename: 'brief.pdf', contentType: 'application/pdf' })
        .expect(201);

      const response = await api()
        .post('/api/tasks', {
          title: 'Launch',
          customFields: {
            client: { name: 'Acme' },
            checklist: [{ item: 'Slides', done: true }, { item: 'Demo' }],
            attachments: [upload.body.data],
            summary: 'Launch (2)',
          },
        })
        .expect(201);

      expect(response.body.data.customFields).toEqual({
        client: { name: 'Acme', tier: 'standard' },
        checklist: [{ item: 'Slides', done: true }, { item: 'Demo' }],
        attachments: [{ id: upload.body.data.id, name: 'brief.pdf', size: 8, contentType: 'application/pdf' }],
        summary: 'Launch (2)',
      });
    });

    it('422 - reports nested errors with their path', async () => {
      const response = await api()
        .post('/api/tasks', {
          title: 'Launch',
          customFields: { client: { tier: 'gold', vat: 'x' }, checklist: [{ done: true }], attachments: 'brief.pdf' },
        })
        .expect(422);

      expect(response.body.error.details).toEqual([
        { field: 'customFields.client.vat', message: 'Field is not part of the task form' },
        { field: 'customFields.client.name', message: 'Client name is required' },
        { field: 'customFields.checklist.0.item', message: 'Item is required' },
        { field: 'customFields.attachments', message: 'Attachments: Must be a list of uploaded files' },
      ]);
    });

    it('200 - PATCH validates a provided nested value completely and keeps the others', async () => {
      const task = await createTask({ title: 'Launch', customFields: { client: { name: 'Acme' }, summary: 's' } });

      const invalid = await api()
        .patch(`/api/tasks/${task.id}`, { customFields: { checklist: [{ done: false }] } })
        .expect(422);
      expect(invalid.body.error.details).toEqual([
        { field: 'customFields.checklist.0.item', message: 'Item is required' },
      ]);

      const response = await api()
        .patch(`/api/tasks/${task.id}`, { customFields: { checklist: [{ item: 'Slides' }] } })
        .expect(200);
      expect(response.body.data.customFields).toEqual({
        client: { name: 'Acme', tier: 'standard' },
        checklist: [{ item: 'Slides' }],
        summary: 's',
      });
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      await createTask({ title: 'Alpha report', status: 'todo', priority: 'high', tags: ['finance'] });
      await createTask({
        title: 'Beta review',
        status: 'in-progress',
        priority: 'low',
        description: 'Check the REPORT',
      });
      await createTask({ title: 'Gamma', status: 'completed', priority: 'high', tags: ['ops'] });
    });

    it('200 - returns paginated tasks with meta', async () => {
      const response = await api().get('/api/tasks?page=1&pageSize=2').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toEqual({ page: 1, pageSize: 2, totalItems: 3, totalPages: 2 });
    });

    it('200 - searches title, description and tags (case-insensitive)', async () => {
      const response = await api().get('/api/tasks?search=report').expect(200);
      expect(response.body.data.map((task: { title: string }) => task.title).sort()).toEqual([
        'Alpha report',
        'Beta review',
      ]);
    });

    it('200 - filters by status, priority and tag', async () => {
      const byStatus = await api().get('/api/tasks?status=completed').expect(200);
      expect(byStatus.body.data.map((task: { title: string }) => task.title)).toEqual(['Gamma']);

      const byPriority = await api().get('/api/tasks?priority=high&tag=finance').expect(200);
      expect(byPriority.body.data.map((task: { title: string }) => task.title)).toEqual(['Alpha report']);
    });

    it('200 - never returns tasks of another organization', async () => {
      const response = await request(ctx.app).get('/api/tasks').set(ORG_HEADER, OTHER_ORG_ID).expect(200);
      expect(response.body.data).toEqual([]);
    });

    it('400 - rejects invalid query parameters', async () => {
      const response = await api().get('/api/tasks?page=0&sortBy=_rid').expect(400);
      expect(response.body.message).toBe('Invalid query parameters');
      expect(response.body.error.details.map((detail: { field: string }) => detail.field)).toEqual(['page', 'sortBy']);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('200 - returns the task', async () => {
      const task = await createTask();
      const response = await api().get(`/api/tasks/${task.id}`).expect(200);
      expect(response.body.data).toEqual(task);
    });

    it('404 - unknown task', async () => {
      const response = await api().get(`/api/tasks/${MISSING_ID}`).expect(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('404 - task of another organization', async () => {
      const task = await createTask();
      await request(ctx.app).get(`/api/tasks/${task.id}`).set(ORG_HEADER, OTHER_ORG_ID).expect(404);
    });

    it('400 - malformed id', async () => {
      const response = await api().get('/api/tasks/not-a-uuid').expect(400);
      expect(response.body.message).toBe('Invalid task id');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('200 - replaces the editable fields', async () => {
      const task = await createTask({ title: 'Old', description: 'remove me', tags: ['x'] });

      const response = await api().put(`/api/tasks/${task.id}`, { title: 'New', status: 'in-progress' }).expect(200);

      expect(response.body.data).toMatchObject({ id: task.id, title: 'New', status: 'in-progress', tags: [] });
      expect(response.body.data.description).toBeUndefined();
      expect(response.body.data.createdAt).toBe(task.createdAt);
    });

    it('404 - unknown task', async () => {
      await api().put(`/api/tasks/${MISSING_ID}`, { title: 'New' }).expect(404);
    });

    it('422 - invalid payload', async () => {
      const task = await createTask();
      await api().put(`/api/tasks/${task.id}`, { title: '' }).expect(422);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('200 - changes the status only', async () => {
      const task = await createTask({ title: 'Keep me', priority: 'low' });

      const response = await api().patch(`/api/tasks/${task.id}`, { status: 'completed' }).expect(200);

      expect(response.body.data).toMatchObject({ title: 'Keep me', priority: 'low', status: 'completed' });
    });

    it('422 - rejects an empty patch', async () => {
      const task = await createTask();
      const response = await api().patch(`/api/tasks/${task.id}`, {}).expect(422);
      expect(response.body.error.details).toEqual([{ field: 'body', message: 'At least one field must be provided' }]);
    });

    it('422 - rejects an invalid status', async () => {
      const task = await createTask();
      await api().patch(`/api/tasks/${task.id}`, { status: 'done' }).expect(422);
    });

    it('404 - unknown task', async () => {
      await api().patch(`/api/tasks/${MISSING_ID}`, { status: 'todo' }).expect(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('204 - deletes the task', async () => {
      const task = await createTask();

      const response = await api().delete(`/api/tasks/${task.id}`).expect(204);

      expect(response.body).toEqual({});
      await api().get(`/api/tasks/${task.id}`).expect(404);
    });

    it('404 - unknown task', async () => {
      await api().delete(`/api/tasks/${MISSING_ID}`).expect(404);
    });
  });

  describe('POST /api/tasks/bulk-delete', () => {
    it('200 - deletes existing tasks and reports missing ones', async () => {
      const first = await createTask();
      const second = await createTask();

      const response = await api()
        .post('/api/tasks/bulk-delete', { ids: [first.id, second.id, MISSING_ID] })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: '2 task(s) deleted',
        data: { deletedIds: [first.id, second.id], notFoundIds: [MISSING_ID] },
      });
    });

    it('422 - rejects invalid ids', async () => {
      await api()
        .post('/api/tasks/bulk-delete', { ids: ['abc'] })
        .expect(422);
    });
  });

  describe('server errors', () => {
    it('500 - hides internal error details', async () => {
      const failingRepository = ctx.taskRepository as unknown as ITaskRepository;
      jest.spyOn(failingRepository, 'findMany').mockRejectedValue(new Error('ECONNREFUSED cosmos:8081'));

      const response = await api().get('/api/tasks').expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
        error: { code: 'INTERNAL_SERVER_ERROR' },
      });
    });
  });
});
