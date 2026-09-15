import type { Container, SqlQuerySpec } from '@azure/cosmos';
import { describe, expect, it, vi } from 'vitest';
import { SYSTEM_FIELDS } from '../src/domain/defaultSettings';
import type { FormSettingsDocument, TaskDocument } from '../src/domain/models';
import {
  CosmosFormSettingsRepository,
  CosmosTaskRepository,
  SettingsConflictError,
  TaskConflictError,
} from '../src/repositories';
import { createRequestTelemetry } from '../src/telemetry';

const organizationId = '00000000-0000-4000-8000-000000000001';
const taskId = '11111111-1111-4111-8111-111111111111';

const task: TaskDocument = {
  id: taskId,
  organizationId,
  title: 'Repository test',
  status: 'todo',
  tags: [],
  customFields: {},
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
  _etag: 'task-etag',
};

const settings: FormSettingsDocument = {
  id: 'form-settings',
  organizationId,
  fields: SYSTEM_FIELDS,
  rows: [
    { id: 'row-title-description', fieldIds: ['title', 'description'] },
    { id: 'row-due-priority', fieldIds: ['dueDate', 'priority'] },
    { id: 'row-status', fieldIds: ['status'] },
    { id: 'row-tags', fieldIds: ['tags'] },
  ],
  updatedAt: '2026-09-14T00:00:00.000Z',
  _etag: 'settings-etag',
};

const createContainer = () => {
  const read = vi.fn();
  const replace = vi.fn();
  const remove = vi.fn();
  const create = vi.fn();
  const query = vi.fn();
  const item = vi.fn(() => ({ read, replace, delete: remove }));
  const container = {
    id: 'Tasks',
    item,
    items: { create, query },
  } as unknown as Container;
  return { container, create, item, query, read, remove, replace };
};

describe('CosmosTaskRepository', () => {
  it('uses point reads with both the item ID and partition key', async () => {
    const fake = createContainer();
    fake.read.mockResolvedValue({ resource: task, requestCharge: 1 });

    await expect(
      new CosmosTaskRepository(fake.container).findById(organizationId, taskId),
    ).resolves.toEqual(task);
    expect(fake.item).toHaveBeenCalledWith(taskId, organizationId);
  });

  it('maps only a Cosmos not-found point read to undefined', async () => {
    const fake = createContainer();
    fake.read.mockRejectedValueOnce({ code: 404 }).mockRejectedValueOnce(new Error('network'));
    const repository = new CosmosTaskRepository(fake.container);

    await expect(repository.findById(organizationId, taskId)).resolves.toBeUndefined();
    await expect(repository.findById(organizationId, taskId)).rejects.toThrow('network');
  });

  it('creates tasks and rejects an invalid empty Cosmos response', async () => {
    const fake = createContainer();
    fake.create
      .mockResolvedValueOnce({ resource: task, requestCharge: 2 })
      .mockResolvedValueOnce({ resource: undefined });
    const repository = new CosmosTaskRepository(fake.container);

    await expect(repository.create(task)).resolves.toEqual(task);
    await expect(repository.create(task)).rejects.toThrow('did not return the created task');
  });

  it('replaces with If-Match and maps Cosmos conflicts', async () => {
    const fake = createContainer();
    fake.replace
      .mockResolvedValueOnce({ resource: task })
      .mockRejectedValueOnce({ statusCode: 412 })
      .mockRejectedValueOnce(new Error('network'));
    const repository = new CosmosTaskRepository(fake.container);

    await repository.replace(task, 'task-etag');
    expect(fake.replace).toHaveBeenNthCalledWith(1, task, {
      accessCondition: { type: 'IfMatch', condition: 'task-etag' },
    });
    await expect(repository.replace(task)).rejects.toBeInstanceOf(TaskConflictError);
    await expect(repository.replace(task)).rejects.toThrow('network');
  });

  it('rejects an empty replace response', async () => {
    const fake = createContainer();
    fake.replace.mockResolvedValue({ resource: undefined });
    await expect(new CosmosTaskRepository(fake.container).replace(task)).rejects.toThrow(
      'did not return the replaced task',
    );
    expect(fake.replace).toHaveBeenCalledWith(task, { accessCondition: undefined });
  });

  it('deletes by point key and distinguishes not-found from other failures', async () => {
    const fake = createContainer();
    fake.remove
      .mockResolvedValueOnce({ requestCharge: 1 })
      .mockRejectedValueOnce({ code: 404 })
      .mockRejectedValueOnce(new Error('network'));
    const repository = new CosmosTaskRepository(fake.container);

    await expect(repository.delete(organizationId, taskId)).resolves.toBe(true);
    await expect(repository.delete(organizationId, taskId)).resolves.toBe(false);
    await expect(repository.delete(organizationId, taskId)).rejects.toThrow('network');
  });

  it('lists using explicit projection and a single aggregate query', async () => {
    const fake = createContainer();
    const specs: SqlQuerySpec[] = [];
    fake.query.mockImplementation((spec: SqlQuerySpec, options: unknown) => {
      specs.push(spec);
      expect(options).toEqual({ partitionKey: organizationId });
      return {
        fetchAll: vi.fn().mockResolvedValue(
          spec.query.includes('ORDER BY')
            ? { resources: [task], requestCharge: 2 }
            : {
                resources: [{ filteredTotal: 1, total: 3, inProgress: 2, dueThisWeek: 1 }],
                requestCharge: 3,
              },
        ),
      };
    });
    const telemetry = createRequestTelemetry();
    const result = await new CosmosTaskRepository(fake.container).list(
      organizationId,
      {
        page: 2,
        pageSize: 5,
        q: 'needle',
        filters: [{ fieldId: 'status', operator: 'equals', value: 'todo' }],
      },
      SYSTEM_FIELDS,
      new Date('2026-09-14T00:00:00.000Z'),
      telemetry,
    );

    expect(result).toEqual({
      items: [task],
      total: 1,
      summary: { total: 3, inProgress: 2, dueThisWeek: 1 },
    });
    expect(specs).toHaveLength(2);
    expect(specs[0]!.query).toContain('SELECT c.id, c.organizationId');
    expect(specs[0]!.query).not.toContain('SELECT *');
    expect(specs[0]!.query).toContain('ORDER BY c._ts DESC, c.id ASC');
    expect(specs[0]!.parameters).toContainEqual({ name: '@offset', value: 5 });
    expect(specs[1]!.query).toContain('filteredTotal: SUM');
    expect(telemetry.snapshot()).toMatchObject({
      cosmosOperationCount: 2,
      cosmosRequestCharge: 5,
    });
  });

  it('defaults missing aggregate values to zero for an unfiltered list', async () => {
    const fake = createContainer();
    fake.query.mockImplementation((spec: SqlQuerySpec) => ({
      fetchAll: vi
        .fn()
        .mockResolvedValue(spec.query.includes('ORDER BY') ? { resources: [] } : { resources: [] }),
    }));

    await expect(
      new CosmosTaskRepository(fake.container).list(
        organizationId,
        { page: 1, pageSize: 10, filters: [] },
        SYSTEM_FIELDS,
        new Date('2026-09-14T00:00:00.000Z'),
      ),
    ).resolves.toEqual({
      items: [],
      total: 0,
      summary: { total: 0, inProgress: 0, dueThisWeek: 0 },
    });
  });
});

describe('CosmosFormSettingsRepository', () => {
  it('reads settings by stable ID and organization partition', async () => {
    const fake = createContainer();
    fake.read.mockResolvedValue({ resource: settings });

    await expect(
      new CosmosFormSettingsRepository(fake.container).get(organizationId),
    ).resolves.toEqual(settings);
    expect(fake.item).toHaveBeenCalledWith('form-settings', organizationId);
  });

  it('maps not-found settings reads while preserving other errors', async () => {
    const fake = createContainer();
    fake.read.mockRejectedValueOnce({ code: 404 }).mockRejectedValueOnce(new Error('network'));
    const repository = new CosmosFormSettingsRepository(fake.container);

    await expect(repository.get(organizationId)).resolves.toBeUndefined();
    await expect(repository.get(organizationId)).rejects.toThrow('network');
  });

  it('creates initial settings and conditionally replaces existing settings', async () => {
    const fake = createContainer();
    fake.create.mockResolvedValue({ resource: settings });
    fake.replace.mockResolvedValue({ resource: settings });
    const repository = new CosmosFormSettingsRepository(fake.container);

    await expect(repository.save(settings)).resolves.toEqual(settings);
    await expect(repository.save(settings, 'settings-etag')).resolves.toEqual(settings);
    expect(fake.create).toHaveBeenCalledWith(settings);
    expect(fake.replace).toHaveBeenCalledWith(settings, {
      accessCondition: { type: 'IfMatch', condition: 'settings-etag' },
    });
  });

  it('maps settings conflicts and rejects empty save responses', async () => {
    const fake = createContainer();
    fake.create
      .mockRejectedValueOnce({ code: 409 })
      .mockResolvedValueOnce({ resource: undefined })
      .mockRejectedValueOnce(new Error('network'));
    const repository = new CosmosFormSettingsRepository(fake.container);

    await expect(repository.save(settings)).rejects.toBeInstanceOf(SettingsConflictError);
    await expect(repository.save(settings)).rejects.toThrow('did not return the saved settings');
    await expect(repository.save(settings)).rejects.toThrow('network');
  });
});
