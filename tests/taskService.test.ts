import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultFormSettings } from '../src/domain/formSettings';
import { ValidationError } from '../src/errors/AppError';
import { TaskService } from '../src/services/TaskService';
import { InMemoryFormSettingsRepository, InMemoryTaskRepository } from './testDoubles';

const organizationId = 'org-local';

function createService() {
  const tasks = new InMemoryTaskRepository();
  const forms = new InMemoryFormSettingsRepository();
  return { tasks, forms, service: new TaskService(tasks, forms) };
}

test('create generates identity and timestamps on the server', async () => {
  const { service } = createService();
  const task = await service.create(organizationId, {
    title: 'Prepare proposal',
    status: 'todo',
  });

  assert.match(task.id, /^[0-9a-f-]{36}$/i);
  assert.equal(task.organizationId, organizationId);
  assert.ok(task.createdAt);
  assert.equal(task.createdAt, task.updatedAt);
});

test('status transitions enforce business rules', async () => {
  const { service } = createService();
  const task = await service.create(organizationId, { title: 'Task', status: 'todo' });

  await assert.rejects(
    service.update(task.id, organizationId, { status: 'completed' }),
    (error: unknown) => error instanceof ValidationError,
  );

  const inProgress = await service.update(task.id, organizationId, { status: 'in-progress' });
  assert.equal(inProgress.status, 'in-progress');
});

test('custom field validation follows active form settings and preserves unrelated values', async () => {
  const { service, forms } = createService();
  const settings = createDefaultFormSettings(organizationId);
  settings.fields.push({
    id: 'customer_email',
    key: 'customer_email',
    label: 'Customer Email',
    type: 'email',
    isSystem: false,
    required: true,
    showInTable: true,
    row: 4,
    column: 1,
    order: 7,
  });
  settings.fields.push({
    id: 'reference',
    key: 'reference',
    label: 'Reference',
    type: 'text',
    isSystem: false,
    required: false,
    showInTable: false,
    row: 4,
    column: 2,
    order: 8,
  });
  await forms.save(settings);

  await assert.rejects(
    service.create(organizationId, { title: 'Task', status: 'todo' }),
    (error: unknown) => error instanceof ValidationError,
  );

  const created = await service.create(organizationId, {
    title: 'Task',
    status: 'todo',
    customFields: {
      customer_email: 'client@example.com',
      reference: 'A-1',
    },
  });

  const updated = await service.update(created.id, organizationId, {
    customFields: { customer_email: 'new@example.com' },
  });

  assert.deepEqual(updated.customFields, {
    customer_email: 'new@example.com',
    reference: 'A-1',
  });
});

test('bulk delete waits for all requested deletions and reports missing ids', async () => {
  const { service } = createService();
  const first = await service.create(organizationId, { title: 'One', status: 'todo' });
  const second = await service.create(organizationId, { title: 'Two', status: 'todo' });

  const result = await service.bulkDelete([first.id, 'missing-task', second.id], organizationId);

  assert.equal(result.deletedCount, 2);
  assert.deepEqual(result.notFoundIds, ['missing-task']);
});

test('required custom text field rejects whitespace-only values', async () => {
  const { service, forms } = createService();
  const settings = createDefaultFormSettings(organizationId);
  settings.fields.push({
    id: 'reference',
    key: 'reference',
    label: 'Reference',
    type: 'text',
    isSystem: false,
    required: true,
    showInTable: true,
    row: 4,
    column: 1,
    order: 7,
  });
  await forms.save(settings);

  await assert.rejects(
    service.create(organizationId, {
      title: 'Task',
      status: 'todo',
      customFields: { reference: '   ' },
    }),
    (error: unknown) => error instanceof ValidationError,
  );
});
