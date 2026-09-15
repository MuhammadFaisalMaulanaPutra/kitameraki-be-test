import { randomUUID } from 'node:crypto';
import { CosmosClient } from '@azure/cosmos';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppConfig } from '../../src/config';
import { provisionCosmos } from '../../src/db/provision';
import { DEFAULT_FORM_SETTINGS } from '../../src/domain/defaultSettings';
import type { FieldDefinition, FormRow, FormSettingsInput } from '../../src/domain/models';
import { CosmosFormSettingsRepository, CosmosTaskRepository } from '../../src/repositories';
import { FormSettingsService, TaskService } from '../../src/services';
import { createRequestTelemetry } from '../../src/telemetry';

const emulatorConnectionString =
  process.env.COSMOS_CONNECTION_STRING ??
  'AccountEndpoint=http://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==;';
const databaseName = `TaskAppIntegration-${randomUUID()}`;
const config: AppConfig = {
  AZURE_FUNCTIONS_ENVIRONMENT: 'Development',
  ORGANIZATION_ID: '00000000-0000-4000-8000-000000000001',
  COSMOS_CONNECTION_STRING: emulatorConnectionString,
  COSMOS_DATABASE_NAME: databaseName,
  COSMOS_TASKS_CONTAINER_NAME: 'Tasks',
  COSMOS_FORM_SETTINGS_CONTAINER_NAME: 'FormSettings',
  ALLOWED_ORIGIN: 'http://localhost:5173',
  MAX_REQUEST_BODY_BYTES: 262144,
  SLOW_COSMOS_OPERATION_MS: 250,
};

const client = new CosmosClient(emulatorConnectionString);
let settingsService: FormSettingsService;
let taskService: TaskService;

const customId = (index: number): string =>
  `custom-00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

const createSettings = (customFieldCount: number): FormSettingsInput => {
  const customFields: FieldDefinition[] = Array.from({ length: customFieldCount }, (_, index) => ({
    id: customId(index),
    label: `Custom ${index}`,
    kind: 'custom',
    type:
      index % 4 === 0 ? 'email' : index % 4 === 1 ? 'date' : index % 4 === 2 ? 'datetime' : 'text',
    required: false,
  }));
  const rows: FormRow[] = customFields.map((field, index) => ({
    id: `custom-row-${index}`,
    fieldIds: [field.id],
  }));
  return {
    fields: [...DEFAULT_FORM_SETTINGS.fields, ...customFields],
    rows: [...DEFAULT_FORM_SETTINGS.rows, ...rows],
  };
};

beforeAll(async () => {
  await provisionCosmos(config);
  const database = client.database(databaseName);
  const settings = new CosmosFormSettingsRepository(database.container('FormSettings'));
  settingsService = new FormSettingsService(settings, {
    clock: () => new Date('2026-09-14T00:00:00.000Z'),
  });
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  taskService = new TaskService(
    new CosmosTaskRepository(database.container('Tasks')),
    settingsService,
    {
      clock: () => new Date('2026-09-14T00:00:00.000Z'),
      newId: () => ids.shift() ?? randomUUID(),
    },
  );
});

afterAll(async () => {
  await client.database(databaseName).delete();
  await client.dispose();
});

describe('Cosmos DB integration', () => {
  it('persists more than 100 form rows and enforces ETag concurrency', async () => {
    const settings = createSettings(101);
    const saved = await settingsService.save(config.ORGANIZATION_ID, settings);

    expect(saved.rows).toHaveLength(105);
    expect(saved.etag).toBeTruthy();
    await expect(
      settingsService.save(config.ORGANIZATION_ID, settings, 'stale-etag'),
    ).rejects.toMatchObject({ status: 409, code: 'settings_conflict' });
  });

  it('supports CRUD, search, filter, pagination, summary, and safe DTOs', async () => {
    const activeSettings = createSettings(1);
    await settingsService.save(
      config.ORGANIZATION_ID,
      activeSettings,
      (await settingsService.get(config.ORGANIZATION_ID)).etag,
    );

    const first = await taskService.create(config.ORGANIZATION_ID, {
      title: 'Alpha task',
      status: 'todo',
      tags: ['backend'],
      customFields: { [customId(0)]: 'alpha@example.com' },
    });
    const second = await taskService.create(config.ORGANIZATION_ID, {
      title: 'Beta task',
      dueDate: '2026-09-16T00:00:00.000Z',
      priority: 'high',
      status: 'in-progress',
      tags: ['urgent'],
      customFields: { [customId(0)]: 'beta@example.com' },
    });

    const telemetry = createRequestTelemetry();
    const page = await taskService.list(
      config.ORGANIZATION_ID,
      { page: 1, pageSize: 1, filters: [] },
      { telemetry },
    );
    expect(page.pagination).toEqual({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    expect(page.summary).toEqual({ total: 2, inProgress: 1, dueThisWeek: 1 });
    expect(telemetry.snapshot().cosmosOperationCount).toBe(3);

    const searched = await taskService.list(config.ORGANIZATION_ID, {
      page: 1,
      pageSize: 10,
      q: 'ALPHA@EXAMPLE.COM',
      filters: [],
    });
    expect(searched.items.map((task) => task.id)).toEqual([first.id]);

    const filtered = await taskService.list(config.ORGANIZATION_ID, {
      page: 1,
      pageSize: 10,
      filters: [{ fieldId: 'status', operator: 'equals', value: 'in-progress' }],
    });
    expect(filtered.items.map((task) => task.id)).toEqual([second.id]);

    const updated = await taskService.update(config.ORGANIZATION_ID, first.id, {
      status: 'completed',
    });
    expect(updated.status).toBe('completed');
    expect(updated).not.toHaveProperty('_etag');
    expect(updated).not.toHaveProperty('_rid');
    expect(await taskService.get(config.ORGANIZATION_ID, first.id)).toMatchObject({
      id: first.id,
      status: 'completed',
    });

    await taskService.delete(config.ORGANIZATION_ID, first.id);
    await expect(taskService.get(config.ORGANIZATION_ID, first.id)).rejects.toMatchObject({
      status: 404,
      code: 'task_not_found',
    });
  });
});
