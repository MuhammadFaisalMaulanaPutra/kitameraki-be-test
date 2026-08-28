import { randomUUID } from 'node:crypto';
import { createDefaultFormSettings } from '../domain/formSettings';
import { CreateTaskInput, Page, Task, TaskListQuery, TaskStatus, UpdateTaskInput } from '../domain/task';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { FormSettingsRepository, TaskRepository } from '../repositories/contracts';
import {
  validateConfiguredSystemFieldsOnCreate,
  validateConfiguredSystemFieldsOnUpdate,
  validateTaskCustomFields,
} from '../validation/taskValidation';

const ALLOWED_STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  todo: ['in-progress'],
  'in-progress': ['todo', 'completed'],
  completed: ['in-progress'],
};

export interface BulkDeleteResult {
  deletedCount: number;
  notFoundIds: string[];
}

export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly formSettings: FormSettingsRepository,
  ) {}

  list(query: TaskListQuery): Promise<Page<Task>> {
    return this.tasks.list(query);
  }

  async getById(id: string, organizationId: string): Promise<Task> {
    const task = await this.tasks.getById(id, organizationId);
    if (!task) {
      throw new NotFoundError('Task not found.');
    }
    return task;
  }

  async create(organizationId: string, input: CreateTaskInput): Promise<Task> {
    const settings =
      (await this.formSettings.get(organizationId)) ?? createDefaultFormSettings(organizationId);

    validateConfiguredSystemFieldsOnCreate(input, settings);
    const customFields = validateTaskCustomFields(input.customFields, settings, true);
    const now = new Date().toISOString();

    const task: Task = {
      id: randomUUID(),
      organizationId,
      title: input.title,
      status: input.status,
      createdAt: now,
      updatedAt: now,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(customFields !== undefined ? { customFields } : {}),
    };

    return this.tasks.create(task);
  }

  async update(id: string, organizationId: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.getById(id, organizationId);
    const settings =
      (await this.formSettings.get(organizationId)) ?? createDefaultFormSettings(organizationId);

    validateConfiguredSystemFieldsOnUpdate(input, settings);

    if (input.status !== undefined && input.status !== existing.status) {
      this.validateStatusTransition(existing.status, input.status);
    }

    const validatedCustomFields =
      input.customFields === undefined
        ? undefined
        : validateTaskCustomFields(input.customFields, settings, false);

    const updated: Task = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: new Date().toISOString(),
    };

    assignNullable(updated, 'description', input.description);
    assignNullable(updated, 'dueDate', input.dueDate);
    assignNullable(updated, 'priority', input.priority);
    assignNullable(updated, 'tags', input.tags);

    if (validatedCustomFields !== undefined) {
      updated.customFields = {
        ...(existing.customFields ?? {}),
        ...validatedCustomFields,
      };
    }

    return this.tasks.replace(updated);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const deleted = await this.tasks.delete(id, organizationId);
    if (!deleted) {
      throw new NotFoundError('Task not found.');
    }
  }

  async bulkDelete(ids: string[], organizationId: string): Promise<BulkDeleteResult> {
    const results = await Promise.all(ids.map((id) => this.tasks.delete(id, organizationId)));
    const notFoundIds = ids.filter((_, index) => !results[index]);
    return {
      deletedCount: ids.length - notFoundIds.length,
      notFoundIds,
    };
  }

  async summary(organizationId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }> {
    const counts = {
      total: 0,
      todo: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    };

    let pageToken: string | undefined;
    const now = Date.now();
    do {
      const page = await this.tasks.list({
        organizationId,
        pageSize: 100,
        pageToken,
        sortDirection: 'desc',
      });

      for (const task of page.items) {
        counts.total += 1;
        if (task.status === 'todo') counts.todo += 1;
        if (task.status === 'in-progress') counts.inProgress += 1;
        if (task.status === 'completed') counts.completed += 1;
        if (task.status !== 'completed' && task.dueDate && Date.parse(task.dueDate) < now) counts.overdue += 1;
      }
      pageToken = page.nextPageToken ?? undefined;
    } while (pageToken);

    return counts;
  }

  private validateStatusTransition(from: TaskStatus, to: TaskStatus): void {
    if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
      throw new ValidationError([
        {
          field: 'status',
          message: `Invalid status transition from "${from}" to "${to}".`,
        },
      ]);
    }
  }
}

function assignNullable<K extends 'description' | 'dueDate' | 'priority' | 'tags'>(
  target: Task,
  key: K,
  value: UpdateTaskInput[K],
): void {
  if (value === undefined) {
    return;
  }

  if (value === null) {
    delete target[key];
    return;
  }

  (target as unknown as Record<string, unknown>)[key] = value;
}
