import { randomUUID } from 'node:crypto';
import { PatchOperation } from '@azure/cosmos';
import { getTasksContainer } from '../cosmos/client';
import { isCosmosNotFound } from '../cosmos/errors';
import { buildTaskCountQuery, buildTaskListQuery, TaskListFilters } from '../cosmos/taskQuery';
import { CreateTaskInput, UpdateTaskInput } from '../schemas/task';

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  status: string;
  tags?: string[];
  customFields?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
}

export async function listTasks(
  filters: TaskListFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedTasks> {
  const container = getTasksContainer();
  const [itemsResult, countResult] = await Promise.all([
    container.items.query<Task>(buildTaskListQuery(filters, page, pageSize)).fetchAll(),
    container.items.query<number>(buildTaskCountQuery(filters)).fetchAll(),
  ]);
  return { items: itemsResult.resources, total: countResult.resources[0] ?? 0 };
}

export async function getTask(id: string, organizationId: string): Promise<Task | undefined> {
  const { resource } = await getTasksContainer().item(id, organizationId).read<Task>();
  return resource;
}

export async function createTask(input: CreateTaskInput, organizationId: string): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = {
    ...input,
    id: randomUUID(),
    organizationId,
    createdAt: now,
    updatedAt: now,
  };
  const { resource } = await getTasksContainer().items.create<Task>(task);
  // `create` always echoes the stored resource back on success.
  return resource as Task;
}

export async function updateTask(
  id: string,
  organizationId: string,
  input: UpdateTaskInput,
): Promise<Task | undefined> {
  // `add` acts as upsert for top-level members: it sets the property whether or
  // not it already exists, which lets us set previously-absent optional fields.
  const operations: PatchOperation[] = Object.entries(input).map(([key, value]) => ({
    op: 'add',
    path: `/${key}`,
    value,
  }));
  operations.push({ op: 'add', path: '/updatedAt', value: new Date().toISOString() });

  const { resource } = await getTasksContainer().item(id, organizationId).patch<Task>(operations);
  return resource;
}

export async function deleteTask(id: string, organizationId: string): Promise<void> {
  await getTasksContainer().item(id, organizationId).delete();
}

/**
 * Deletes many tasks concurrently and *waits for all of them*. The original
 * `body.forEach(async …)` returned before any delete finished and swallowed
 * every error. Missing ids are treated as already-deleted (idempotent).
 */
export async function bulkDeleteTasks(ids: string[], organizationId: string): Promise<void> {
  const container = getTasksContainer();
  await Promise.all(
    ids.map(async (id) => {
      try {
        await container.item(id, organizationId).delete();
      } catch (error) {
        if (!isCosmosNotFound(error)) {
          throw error;
        }
      }
    }),
  );
}
