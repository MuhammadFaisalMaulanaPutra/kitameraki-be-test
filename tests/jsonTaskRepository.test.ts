import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Task } from '../src/domain/task';
import { JsonTaskRepository } from '../src/repositories/json/JsonTaskRepository';

const organizationId = 'org-local';

function task(id: string, title: string, status: Task['status'], priority: Task['priority']): Task {
  return {
    id,
    organizationId,
    title,
    status,
    priority,
    createdAt: `2026-01-0${id.slice(-1)}T00:00:00.000Z`,
    updatedAt: `2026-01-0${id.slice(-1)}T00:00:00.000Z`,
  };
}

test('JSON repository supports filtering and opaque pagination tokens', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kitameraki-be-test-'));
  try {
    const repository = new JsonTaskRepository(directory);
    await repository.create(task('task-1', 'Alpha', 'todo', 'high'));
    await repository.create(task('task-2', 'Beta', 'completed', 'low'));
    await repository.create(task('task-3', 'Gamma', 'todo', 'medium'));

    const firstPage = await repository.list({
      organizationId,
      status: 'todo',
      pageSize: 1,
      sortBy: 'title',
      sortDirection: 'asc',
    });

    assert.equal(firstPage.items.length, 1);
    assert.equal(firstPage.items[0].title, 'Alpha');
    assert.ok(firstPage.nextPageToken);

    const secondPage = await repository.list({
      organizationId,
      status: 'todo',
      pageSize: 1,
      pageToken: firstPage.nextPageToken ?? undefined,
      sortBy: 'title',
      sortDirection: 'asc',
    });

    assert.equal(secondPage.items[0].title, 'Gamma');
    assert.equal(secondPage.nextPageToken, null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
