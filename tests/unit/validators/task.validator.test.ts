import {
  bulkDeleteTasksSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '../../../src/validators/task.validator';

describe('task validators', () => {
  describe('createTaskSchema (shape and hard limits only)', () => {
    it('accepts a complete payload, including typed and nested custom values', () => {
      const result = createTaskSchema.safeParse({
        title: 'Task',
        description: 'Details',
        dueDate: '2026-12-01T09:00:00.000Z',
        priority: 'high',
        status: 'in-review',
        tags: ['a', 'b'],
        customFields: {
          estimate: 3,
          billable: true,
          reviewers: ['ana'],
          note: 'x',
          cleared: null,
          client: { name: 'Acme', contacts: [{ email: 'a@acme.test' }] },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts an empty payload (required fields come from the form settings)', () => {
      expect(createTaskSchema.safeParse({}).success).toBe(true);
    });

    it.each([
      ['title over 100 chars', { title: 'x'.repeat(101) }],
      ['description over 1000 chars', { description: 'x'.repeat(1001) }],
      ['status over 50 chars', { status: 'x'.repeat(51) }],
      ['tag over 50 chars', { tags: ['x'.repeat(51)] }],
      ['more than 20 tags', { tags: Array.from({ length: 21 }, (_, i) => `tag${i}`) }],
      ['invalid custom field key', { customFields: { '1bad key': 'x' } }],
      ['non-string title', { title: 42 }],
    ])('rejects %s', (_label, payload) => {
      expect(createTaskSchema.safeParse(payload).success).toBe(false);
    });

    it.each([
      [
        'a string over 1000 chars',
        { a: { b: 'x'.repeat(1001) } },
        'customFields.note.a.b: Must be at most 1000 characters',
      ],
      [
        'an array over 100 items',
        { a: Array.from({ length: 101 }, () => 1) },
        'customFields.note.a: Must contain at most 100 items',
      ],
      [
        'an object over 100 keys',
        Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`k${i}`, i])),
        'customFields.note: Must contain at most 100 properties',
      ],
      [
        'values nested deeper than 8 levels',
        [[[[[[[[[1]]]]]]]]],
        'customFields.note.0.0.0.0.0.0.0.0: Values can be nested at most 8 levels deep',
      ],
      ['a non-finite number', { a: Number.POSITIVE_INFINITY }, 'customFields.note.a: Must be a finite number'],
      ['a non-JSON value', { a: () => 1 }, 'customFields.note.a: Must be a JSON value'],
    ])('bounds custom JSON values: rejects %s', (_label, value, message) => {
      const result = createTaskSchema.safeParse({ customFields: { note: value } });
      expect(result.error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)).toEqual([message]);
    });

    it('rejects server-managed properties (mass assignment)', () => {
      const result = createTaskSchema.safeParse({ title: 't', id: 'x', organizationId: 'y', createdAt: 'z' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskSchema', () => {
    it('accepts a partial payload', () => {
      expect(updateTaskSchema.parse({ status: 'completed' })).toEqual({ status: 'completed' });
    });

    it('accepts null to clear values', () => {
      expect(updateTaskSchema.safeParse({ description: null, dueDate: null, priority: null }).success).toBe(true);
    });

    it('rejects an empty payload', () => {
      expect(updateTaskSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('listTasksQuerySchema', () => {
    it('applies defaults', () => {
      expect(listTasksQuerySchema.parse({})).toEqual({ page: 1, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' });
    });

    it('coerces numeric strings and accepts any configured status value', () => {
      expect(listTasksQuerySchema.parse({ page: '3', pageSize: '25', status: 'in-review' })).toMatchObject({
        page: 3,
        pageSize: 25,
        status: 'in-review',
      });
    });

    it.each([
      { page: '0' },
      { pageSize: '101' },
      { page: 'abc' },
      { sortBy: 'organizationId' },
      { status: 'x'.repeat(51) },
    ])('rejects %o', (query) => {
      expect(listTasksQuerySchema.safeParse(query).success).toBe(false);
    });
  });

  describe('bulkDeleteTasksSchema', () => {
    it('deduplicates ids', () => {
      const id = '11111111-1111-4111-8111-111111111111';
      expect(bulkDeleteTasksSchema.parse({ ids: [id, id] })).toEqual({ ids: [id] });
    });

    it.each([{ ids: [] }, { ids: ['not-a-uuid'] }, {}])('rejects %o', (payload) => {
      expect(bulkDeleteTasksSchema.safeParse(payload).success).toBe(false);
    });
  });
});
