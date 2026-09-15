import { describe, expect, it } from 'vitest';
import { DEFAULT_FORM_SETTINGS } from '../src/domain/defaultSettings';
import type {
  FieldDefinition,
  FormSettingsDocument,
  TaskDocument,
  TaskSummary,
} from '../src/domain/models';
import type { FormSettingsRepository, TaskListResult, TaskRepository } from '../src/repositories';
import { SettingsConflictError, TaskConflictError } from '../src/repositories';
import { FormSettingsService, TaskService, toTaskResponse } from '../src/services';

const organizationId = '00000000-0000-4000-8000-000000000001';
const taskId = '11111111-1111-4111-8111-111111111111';
const fixedDate = new Date('2026-09-14T00:00:00.000Z');

class FakeSettingsRepository implements FormSettingsRepository {
  document?: FormSettingsDocument;
  saveError?: Error;

  async get(): Promise<FormSettingsDocument | undefined> {
    return this.document;
  }

  async save(document: FormSettingsDocument): Promise<FormSettingsDocument> {
    if (this.saveError) throw this.saveError;
    this.document = { ...document, _etag: 'etag-2' };
    return this.document;
  }
}

class FakeTaskRepository implements TaskRepository {
  listTotal?: number;
  removeOnConflict = false;
  replaceError?: Error;
  replaceConflictsRemaining = 0;
  task?: TaskDocument;

  async findById(): Promise<TaskDocument | undefined> {
    return this.task;
  }

  async create(task: TaskDocument): Promise<TaskDocument> {
    this.task = { ...task, _etag: 'etag-created' };
    return this.task;
  }

  async replace(task: TaskDocument): Promise<TaskDocument> {
    if (this.replaceError) throw this.replaceError;
    if (this.replaceConflictsRemaining > 0) {
      this.replaceConflictsRemaining -= 1;
      this.task = {
        ...this.task!,
        description: 'Concurrent description',
        _etag: 'etag-concurrent',
      };
      if (this.removeOnConflict) this.task = undefined;
      throw new TaskConflictError();
    }
    this.task = { ...task, _etag: 'etag-replaced' };
    return this.task;
  }

  async delete(): Promise<boolean> {
    const found = Boolean(this.task);
    this.task = undefined;
    return found;
  }

  async list(): Promise<TaskListResult> {
    const total = this.listTotal ?? (this.task ? 1 : 0);
    return {
      items: this.task ? [this.task] : [],
      total,
      summary: { total, inProgress: 0, dueThisWeek: 0 },
    };
  }
}

const createTask = (): TaskDocument => ({
  id: taskId,
  organizationId,
  title: 'Original',
  status: 'todo',
  tags: [],
  customFields: {},
  createdAt: fixedDate.toISOString(),
  updatedAt: fixedDate.toISOString(),
  _etag: 'etag-1',
});

const customFields: FieldDefinition[] = [
  {
    id: 'custom-22222222-2222-4222-8222-222222222222',
    label: 'Text field',
    kind: 'custom',
    type: 'text',
    required: false,
  },
  {
    id: 'custom-33333333-3333-4333-8333-333333333333',
    label: 'Email field',
    kind: 'custom',
    type: 'email',
    required: false,
  },
  {
    id: 'custom-44444444-4444-4444-8444-444444444444',
    label: 'Date field',
    kind: 'custom',
    type: 'date',
    required: false,
  },
  {
    id: 'custom-55555555-5555-4555-8555-555555555555',
    label: 'Datetime field',
    kind: 'custom',
    type: 'datetime',
    required: false,
  },
];

const configuredSettings = (): FormSettingsDocument => ({
  id: 'form-settings',
  organizationId,
  fields: [...DEFAULT_FORM_SETTINGS.fields, ...customFields],
  rows: [
    ...DEFAULT_FORM_SETTINGS.rows,
    ...customFields.map((field, index) => ({ id: `row-custom-${index}`, fieldIds: [field.id] })),
  ],
  updatedAt: fixedDate.toISOString(),
  _etag: 'etag-current',
});

const createService = (tasks: FakeTaskRepository, settings = new FakeSettingsRepository()) =>
  new TaskService(tasks, new FormSettingsService(settings, { clock: () => fixedDate }), {
    clock: () => fixedDate,
    newId: () => taskId,
  });

describe('services', () => {
  it('returns default settings without writing when no settings exist', async () => {
    const repository = new FakeSettingsRepository();
    const settings = await new FormSettingsService(repository).get(organizationId);
    expect(settings).toEqual(DEFAULT_FORM_SETTINGS);
    expect(repository.document).toBeUndefined();
  });

  it('rejects stale settings updates', async () => {
    const repository = new FakeSettingsRepository();
    repository.document = {
      id: 'form-settings',
      organizationId,
      ...DEFAULT_FORM_SETTINGS,
      updatedAt: fixedDate.toISOString(),
      _etag: 'etag-current',
    };
    await expect(
      new FormSettingsService(repository).save(organizationId, DEFAULT_FORM_SETTINGS, 'etag-stale'),
    ).rejects.toMatchObject({ status: 409, code: 'settings_conflict' });
  });

  it('returns persisted settings including their ETag', async () => {
    const repository = new FakeSettingsRepository();
    repository.document = configuredSettings();

    await expect(new FormSettingsService(repository).get(organizationId)).resolves.toMatchObject({
      fields: configuredSettings().fields,
      etag: 'etag-current',
    });
  });

  it('creates initial settings and updates existing settings with a matching ETag', async () => {
    const repository = new FakeSettingsRepository();
    const service = new FormSettingsService(repository, { clock: () => fixedDate });

    await expect(service.save(organizationId, DEFAULT_FORM_SETTINGS)).resolves.toMatchObject({
      updatedAt: fixedDate.toISOString(),
      etag: 'etag-2',
    });
    await expect(
      service.save(organizationId, DEFAULT_FORM_SETTINGS, 'etag-2'),
    ).resolves.toMatchObject({ etag: 'etag-2' });
  });

  it('rejects an ETag when settings have already disappeared', async () => {
    await expect(
      new FormSettingsService(new FakeSettingsRepository()).save(
        organizationId,
        DEFAULT_FORM_SETTINGS,
        'old-etag',
      ),
    ).rejects.toMatchObject({ status: 409, code: 'settings_conflict' });
  });

  it('maps repository settings conflicts and preserves unrelated errors', async () => {
    const repository = new FakeSettingsRepository();
    repository.saveError = new SettingsConflictError();
    const service = new FormSettingsService(repository);
    await expect(service.save(organizationId, DEFAULT_FORM_SETTINGS)).rejects.toMatchObject({
      status: 409,
      code: 'settings_conflict',
    });

    repository.saveError = new Error('network');
    await expect(service.save(organizationId, DEFAULT_FORM_SETTINGS)).rejects.toThrow('network');
  });

  it('preserves removed custom values in storage while hiding them in responses', async () => {
    const tasks = new FakeTaskRepository();
    tasks.task = {
      ...createTask(),
      customFields: { 'custom-22222222-2222-4222-8222-222222222222': 'historical' },
    };
    const response = await createService(tasks).update(organizationId, taskId, {
      title: 'Updated',
    });

    expect(tasks.task.customFields).toEqual({
      'custom-22222222-2222-4222-8222-222222222222': 'historical',
    });
    expect(response.customFields).toEqual({});
  });

  it('retries a concurrent update and preserves unrelated changes', async () => {
    const tasks = new FakeTaskRepository();
    tasks.task = createTask();
    tasks.replaceConflictsRemaining = 1;

    const response = await createService(tasks).update(organizationId, taskId, {
      status: 'completed',
    });

    expect(response.status).toBe('completed');
    expect(response.description).toBe('Concurrent description');
  });

  it('returns a conflict after repeated concurrent updates', async () => {
    const tasks = new FakeTaskRepository();
    tasks.task = createTask();
    tasks.replaceConflictsRemaining = 2;

    await expect(
      createService(tasks).update(organizationId, taskId, { status: 'completed' }),
    ).rejects.toMatchObject({ status: 409, code: 'task_conflict' });
  });

  it('returns not found when a task or its concurrent replacement disappears', async () => {
    const missingTasks = new FakeTaskRepository();
    await expect(createService(missingTasks).get(organizationId, taskId)).rejects.toMatchObject({
      status: 404,
      code: 'task_not_found',
    });
    await expect(
      createService(missingTasks).update(organizationId, taskId, { title: 'Changed' }),
    ).rejects.toMatchObject({ status: 404, code: 'task_not_found' });

    const conflictingTasks = new FakeTaskRepository();
    conflictingTasks.task = createTask();
    conflictingTasks.replaceConflictsRemaining = 1;
    conflictingTasks.removeOnConflict = true;
    await expect(
      createService(conflictingTasks).update(organizationId, taskId, { title: 'Changed' }),
    ).rejects.toMatchObject({ status: 404, code: 'task_not_found' });
  });

  it('preserves non-conflict repository failures during updates', async () => {
    const tasks = new FakeTaskRepository();
    tasks.task = createTask();
    tasks.replaceError = new Error('network');
    await expect(
      createService(tasks).update(organizationId, taskId, { title: 'Changed' }),
    ).rejects.toThrow('network');
  });

  it('creates and reads a task with valid custom values', async () => {
    const tasks = new FakeTaskRepository();
    const settings = new FakeSettingsRepository();
    settings.document = configuredSettings();
    const service = createService(tasks, settings);
    const values = {
      [customFields[0]!.id]: 'text',
      [customFields[1]!.id]: 'owner@example.com',
      [customFields[2]!.id]: '2026-09-14',
      [customFields[3]!.id]: '2026-09-14T10:00:00.000Z',
    };

    await expect(
      service.create(organizationId, {
        title: 'Created',
        description: 'Description',
        dueDate: '2026-09-21T00:00:00.000Z',
        priority: 'high',
        status: 'in-progress',
        tags: ['backend'],
        customFields: values,
      }),
    ).resolves.toMatchObject({ id: taskId, customFields: values });
    await expect(service.get(organizationId, taskId)).resolves.toMatchObject({ title: 'Created' });
  });

  it.each([
    ['custom-99999999-9999-4999-8999-999999999999', 'value', 'Unknown custom field'],
    [customFields[1]!.id, 'not-email', 'valid email'],
    [customFields[2]!.id, 'not-date', 'valid date'],
    [customFields[3]!.id, 'not-datetime', 'valid date and time'],
  ])('rejects invalid custom values for %s', async (fieldId, value, message) => {
    const settings = new FakeSettingsRepository();
    settings.document = configuredSettings();
    await expect(
      createService(new FakeTaskRepository(), settings).create(organizationId, {
        title: 'Invalid',
        status: 'todo',
        tags: [],
        customFields: { [fieldId]: value },
      }),
    ).rejects.toThrow(message);
  });

  it('accepts empty custom values and defaults optional collections', async () => {
    const tasks = new FakeTaskRepository();
    const settings = new FakeSettingsRepository();
    settings.document = configuredSettings();
    const result = await createService(tasks, settings).create(organizationId, {
      title: 'Defaults',
      status: 'todo',
      tags: [],
      customFields: { [customFields[1]!.id]: null },
    });
    expect(result.customFields).toEqual({ [customFields[1]!.id]: null });
  });

  it('validates filters against global settings before listing', async () => {
    const settings = new FakeSettingsRepository();
    settings.document = configuredSettings();
    await expect(
      createService(new FakeTaskRepository(), settings).list(organizationId, {
        page: 1,
        pageSize: 10,
        filters: [{ fieldId: 'missing', operator: 'contains', value: 'x' }],
      }),
    ).rejects.toMatchObject({ status: 400, code: 'validation_error' });
  });

  it('returns not found for deleting a missing task', async () => {
    await expect(
      createService(new FakeTaskRepository()).delete(organizationId, taskId),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('deletes an existing task', async () => {
    const tasks = new FakeTaskRepository();
    tasks.task = createTask();
    await expect(createService(tasks).delete(organizationId, taskId)).resolves.toBeUndefined();
    expect(tasks.task).toBeUndefined();
  });

  it('never exposes Cosmos DB metadata in a task response', () => {
    const response = toTaskResponse(
      {
        ...createTask(),
        _rid: 'internal-rid',
        _attachments: 'attachments/',
        _ts: 123,
      },
      DEFAULT_FORM_SETTINGS.fields,
    );

    expect(response).not.toHaveProperty('_etag');
    expect(response).not.toHaveProperty('_rid');
    expect(response).not.toHaveProperty('_attachments');
    expect(response).not.toHaveProperty('_ts');
  });

  it('provides safe defaults for legacy task documents', () => {
    const legacy = {
      id: taskId,
      organizationId,
      title: 'Legacy',
      status: 'todo' as const,
      createdAt: '',
      updatedAt: '',
    } as TaskDocument;
    expect(toTaskResponse(legacy, DEFAULT_FORM_SETTINGS.fields)).toMatchObject({
      tags: [],
      customFields: {},
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });
  });

  it('lists tasks with pagination and repository summary', async () => {
    const tasks = new FakeTaskRepository();
    tasks.task = createTask();
    const result = await createService(tasks).list(organizationId, {
      page: 1,
      pageSize: 10,
      filters: [],
    });
    const expectedSummary: TaskSummary = { total: 1, inProgress: 0, dueThisWeek: 0 };

    expect(result.items).toHaveLength(1);
    expect(result.summary).toEqual(expectedSummary);
    expect(result.pagination).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
  });

  it('calculates multiple pages for filtered task lists', async () => {
    const tasks = new FakeTaskRepository();
    tasks.task = createTask();
    tasks.listTotal = 3;
    const result = await createService(tasks).list(organizationId, {
      page: 2,
      pageSize: 1,
      q: 'original',
      filters: [],
    });
    expect(result.pagination.totalPages).toBe(3);
  });
});
