import { randomUUID } from 'node:crypto';
import type { ITaskRepository } from '../interfaces/task.repository.interface';
import { isCoreKey } from '../models/form-settings.model';
import type { Task } from '../models/task.model';
import { NotFoundError } from '../utils/errors';
import type { PaginationMeta } from '../utils/response';
import {
  extractTaskValues,
  type TaskValues,
  validateTaskValues,
  type ValidationMode,
} from '../validators/task-values.validator';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '../validators/task.validator';
import type { FormSettingsService } from './form-settings.service';

export interface PaginatedTasks {
  items: Task[];
  meta: PaginationMeta;
}

export interface BulkDeleteResult {
  deletedIds: string[];
  notFoundIds: string[];
}

/**
 * Writes validated values onto a task: core keys (title, status, ...) are task properties,
 * every other key lives in `customFields`. `null` clears a value.
 */
function applyValues(task: Task, values: TaskValues): Task {
  const updated: Task = { ...task, tags: [...task.tags], customFields: { ...task.customFields } };

  for (const [key, value] of Object.entries(values)) {
    if (!isCoreKey(key)) {
      if (value === null) delete updated.customFields[key];
      else updated.customFields[key] = value;
    } else if (key === 'tags') {
      // Tag list / checklist value: a list of strings (enforced by the value rules).
      updated.tags = Array.isArray(value) ? (value as string[]) : [];
    } else if (value === null) {
      delete updated[key];
    } else {
      // Core keys only accept text, date or single-choice components (enforced by the settings validator).
      updated[key] = String(value);
    }
  }

  return updated;
}

export class TaskService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly formSettingsService: FormSettingsService,
    private readonly now: () => Date = () => new Date(),
    private readonly generateId: () => string = randomUUID,
  ) {}

  async listTasks(organizationId: string, query: ListTasksQuery): Promise<PaginatedTasks> {
    const { page, pageSize, sortBy, sortOrder, search, status, priority, tag } = query;

    const { items, totalItems } = await this.taskRepository.findMany(organizationId, {
      filter: { search: search?.toLowerCase() || undefined, status, priority, tag: tag || undefined },
      sort: { sortBy, sortOrder },
      pagination: { page, pageSize },
    });

    return {
      items,
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async getTask(organizationId: string, id: string): Promise<Task> {
    const task = await this.taskRepository.findById(organizationId, id);
    if (!task) throw new NotFoundError(`Task with id "${id}" was not found`);
    return task;
  }

  async createTask(organizationId: string, input: CreateTaskInput): Promise<Task> {
    const values = await this.validate(organizationId, input, 'create');
    const timestamp = this.now().toISOString();

    const task: Task = {
      id: this.generateId(),
      organizationId,
      tags: [],
      customFields: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return this.taskRepository.create(applyValues(task, values));
  }

  /** PUT semantics: every value of the task form is replaced (missing optional values are cleared). */
  async replaceTask(organizationId: string, id: string, input: CreateTaskInput): Promise<Task> {
    const existing = await this.getTask(organizationId, id);
    const values = await this.validate(organizationId, input, 'replace', existing);
    return this.taskRepository.update(applyValues({ ...existing, updatedAt: this.now().toISOString() }, values));
  }

  /** PATCH semantics: only the provided values change. */
  async updateTask(organizationId: string, id: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.getTask(organizationId, id);
    const values = await this.validate(organizationId, input, 'patch', existing);
    return this.taskRepository.update(applyValues({ ...existing, updatedAt: this.now().toISOString() }, values));
  }

  async deleteTask(organizationId: string, id: string): Promise<void> {
    const deleted = await this.taskRepository.delete(organizationId, id);
    if (!deleted) throw new NotFoundError(`Task with id "${id}" was not found`);
  }

  /**
   * Deletes several tasks. Unlike the legacy implementation (fire-and-forget `forEach(async ...)`),
   * every deletion is awaited so failures surface and the response reflects what really happened.
   */
  async bulkDeleteTasks(organizationId: string, ids: string[]): Promise<BulkDeleteResult> {
    const outcomes = await Promise.all(
      ids.map(async (id) => ({ id, deleted: await this.taskRepository.delete(organizationId, id) })),
    );

    return {
      deletedIds: outcomes.filter((outcome) => outcome.deleted).map((outcome) => outcome.id),
      notFoundIds: outcomes.filter((outcome) => !outcome.deleted).map((outcome) => outcome.id),
    };
  }

  /** Validates the payload against the organization's current form settings. */
  private async validate(
    organizationId: string,
    input: CreateTaskInput | UpdateTaskInput,
    mode: ValidationMode,
    existing?: Task,
  ): Promise<TaskValues> {
    const rows = await this.formSettingsService.getRows(organizationId);
    return validateTaskValues(rows, extractTaskValues(input), { mode, existing, now: this.now() });
  }
}
