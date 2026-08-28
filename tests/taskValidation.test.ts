import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '../src/errors/AppError';
import { parseBulkDeleteBody, parseCreateTaskBody, parseUpdateTaskBody } from '../src/validation/taskValidation';

test('create task rejects server-managed properties', () => {
  assert.throws(
    () =>
      parseCreateTaskBody({
        id: 'client-controlled-id',
        title: 'Task',
        status: 'todo',
      }),
    (error: unknown) =>
      error instanceof ValidationError && error.issues.some((issue) => issue.field === 'id'),
  );
});

test('create task normalizes valid input', () => {
  const parsed = parseCreateTaskBody({
    organizationId: 'org-local',
    title: '  Prepare proposal  ',
    description: '  Draft for client  ',
    priority: 'high',
    status: 'todo',
    tags: ['sales', 'sales', 'client'],
  });

  assert.equal(parsed.organizationId, 'org-local');
  assert.equal(parsed.input.title, 'Prepare proposal');
  assert.equal(parsed.input.description, 'Draft for client');
  assert.deepEqual(parsed.input.tags, ['sales', 'client']);
});

test('update task rejects immutable organizationId', () => {
  assert.throws(
    () => parseUpdateTaskBody({ organizationId: 'other-org' }),
    (error: unknown) =>
      error instanceof ValidationError && error.issues.some((issue) => issue.field === 'organizationId'),
  );
});

test('bulk delete accepts object and deduplicates ids', () => {
  assert.deepEqual(parseBulkDeleteBody({ ids: ['task-1', 'task-1', 'task-2'] }), ['task-1', 'task-2']);
});

test('create task rejects impossible calendar date-times and timezone-less values', () => {
  assert.throws(
    () => parseCreateTaskBody({ title: 'Task', status: 'todo', dueDate: '2026-02-30T10:00:00Z' }),
    (error: unknown) => error instanceof ValidationError,
  );

  assert.throws(
    () => parseCreateTaskBody({ title: 'Task', status: 'todo', dueDate: '2026-08-29T10:00' }),
    (error: unknown) => error instanceof ValidationError,
  );
});
