import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DEFAULT_FORM_SETTINGS, SYSTEM_FIELDS } from './domain/defaultSettings';
import { validateFilters } from './domain/schemas';
import { AppError } from './errors';
import { SettingsConflictError, TaskConflictError } from './repositories';
import type {
  FieldDefinition,
  FormSettings,
  FormSettingsInput,
  ListTasksQuery,
  PaginatedTasks,
  Task,
  TaskDocument,
  TaskInput,
  TaskPatch,
} from './domain/models';
import type { FormSettingsRepository, TaskRepository } from './repositories';
import type { RequestTelemetry } from './telemetry';

export interface ServiceContext {
  telemetry?: RequestTelemetry;
}

interface ServiceDependencies {
  clock?: () => Date;
  newId?: () => string;
}

const MAX_UPDATE_ATTEMPTS = 2;

export class FormSettingsService {
  private readonly clock: () => Date;

  constructor(
    private readonly repository: FormSettingsRepository,
    dependencies: Pick<ServiceDependencies, 'clock'> = {},
  ) {
    this.clock = dependencies.clock ?? (() => new Date());
  }

  async get(organizationId: string, context: ServiceContext = {}): Promise<FormSettings> {
    const document = await this.repository.get(organizationId, context.telemetry);
    if (!document) return cloneDefaultSettings();
    return {
      fields: document.fields,
      rows: document.rows,
      updatedAt: document.updatedAt,
      etag: document._etag,
    };
  }

  async save(
    organizationId: string,
    settings: FormSettingsInput,
    expectedEtag?: string,
    context: ServiceContext = {},
  ): Promise<FormSettings> {
    const current = await this.repository.get(organizationId, context.telemetry);
    if (current && (!expectedEtag || current._etag !== expectedEtag)) {
      throw new AppError(
        409,
        'settings_conflict',
        'The form changed in another session. Reload and try again.',
      );
    }
    if (!current && expectedEtag) {
      throw new AppError(409, 'settings_conflict', 'The form version is no longer current.');
    }

    try {
      const saved = await this.repository.save(
        {
          id: 'form-settings',
          organizationId,
          fields: settings.fields,
          rows: settings.rows,
          updatedAt: this.clock().toISOString(),
        },
        current?._etag,
        context.telemetry,
      );
      return {
        fields: saved.fields,
        rows: saved.rows,
        updatedAt: saved.updatedAt,
        etag: saved._etag,
      };
    } catch (error) {
      if (error instanceof SettingsConflictError) {
        throw new AppError(
          409,
          'settings_conflict',
          'The form changed in another session. Reload and try again.',
        );
      }
      throw error;
    }
  }
}

export class TaskService {
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(
    private readonly tasks: TaskRepository,
    private readonly settings: FormSettingsService,
    dependencies: ServiceDependencies = {},
  ) {
    this.clock = dependencies.clock ?? (() => new Date());
    this.newId = dependencies.newId ?? randomUUID;
  }

  async list(
    organizationId: string,
    query: ListTasksQuery,
    context: ServiceContext = {},
  ): Promise<PaginatedTasks> {
    const now = this.clock();
    let settings: FormSettings;
    let result;

    if (!query.q && query.filters.length === 0) {
      [settings, result] = await Promise.all([
        this.settings.get(organizationId, context),
        this.tasks.list(organizationId, query, SYSTEM_FIELDS, now, context.telemetry),
      ]);
    } else {
      settings = await this.settings.get(organizationId, context);
      validateFilters(query.filters, settings.fields);
      result = await this.tasks.list(
        organizationId,
        query,
        settings.fields,
        now,
        context.telemetry,
      );
    }

    const sanitized = result.items.map((task) => toTaskResponse(task, settings.fields));
    return {
      items: sanitized,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.pageSize)),
      },
      summary: result.summary,
    };
  }

  async get(organizationId: string, id: string, context: ServiceContext = {}): Promise<Task> {
    const [task, settings] = await Promise.all([
      this.tasks.findById(organizationId, id, context.telemetry),
      this.settings.get(organizationId, context),
    ]);
    if (!task) throw new AppError(404, 'task_not_found', 'Task not found.');
    return toTaskResponse(task, settings.fields);
  }

  async create(
    organizationId: string,
    input: TaskInput,
    context: ServiceContext = {},
  ): Promise<Task> {
    const settings = await this.settings.get(organizationId, context);
    validateCustomValues(input.customFields, settings.fields);
    const timestamp = this.clock().toISOString();
    const created = await this.tasks.create(
      {
        id: this.newId(),
        organizationId,
        ...input,
        customFields: input.customFields ?? {},
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      context.telemetry,
    );
    return toTaskResponse(created, settings.fields);
  }

  async update(
    organizationId: string,
    id: string,
    patch: TaskPatch,
    context: ServiceContext = {},
  ): Promise<Task> {
    const [initialTask, settings] = await Promise.all([
      this.tasks.findById(organizationId, id, context.telemetry),
      this.settings.get(organizationId, context),
    ]);
    if (!initialTask) throw new AppError(404, 'task_not_found', 'Task not found.');
    if (patch.customFields) validateCustomValues(patch.customFields, settings.fields);

    let current = initialTask;
    for (let attempt = 0; attempt < MAX_UPDATE_ATTEMPTS; attempt += 1) {
      const timestamp = this.clock().toISOString();
      const updated = mergeTask(current, patch, timestamp);
      try {
        const saved = await this.tasks.replace(updated, current._etag, context.telemetry);
        return toTaskResponse(saved, settings.fields);
      } catch (error) {
        if (!(error instanceof TaskConflictError)) throw error;
        if (attempt === MAX_UPDATE_ATTEMPTS - 1) break;
        const latest = await this.tasks.findById(organizationId, id, context.telemetry);
        if (!latest) throw new AppError(404, 'task_not_found', 'Task not found.');
        current = latest;
      }
    }

    throw new AppError(
      409,
      'task_conflict',
      'The task changed in another session. Reload and try again.',
    );
  }

  async delete(organizationId: string, id: string, context: ServiceContext = {}): Promise<void> {
    if (!(await this.tasks.delete(organizationId, id, context.telemetry))) {
      throw new AppError(404, 'task_not_found', 'Task not found.');
    }
  }
}

export const toTaskResponse = (task: TaskDocument, fields: FieldDefinition[]): Task => {
  const allowed = new Set(
    fields.filter((field) => field.kind === 'custom').map((field) => field.id),
  );
  return {
    id: task.id,
    organizationId: task.organizationId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    tags: task.tags ?? [],
    customFields: Object.fromEntries(
      Object.entries(task.customFields ?? {}).filter(([id]) => allowed.has(id)),
    ),
    createdAt: task.createdAt || new Date(0).toISOString(),
    updatedAt: task.updatedAt || new Date(0).toISOString(),
  };
};

const validateCustomValues = (
  values: Record<string, string | null>,
  fields: FieldDefinition[],
): void => {
  const activeCustomFields = fields.filter((field) => field.kind === 'custom');
  for (const [id, value] of Object.entries(values)) {
    const field = activeCustomFields.find((candidate) => candidate.id === id);
    if (!field) throw new AppError(400, 'validation_error', `Unknown custom field: ${id}.`);
    if (!value) continue;
    if (field.type === 'email' && !z.email().safeParse(value).success) {
      throw new AppError(400, 'validation_error', `${field.label} must be a valid email address.`);
    }
    if (field.type === 'date' && !z.iso.date().safeParse(value).success) {
      throw new AppError(400, 'validation_error', `${field.label} must be a valid date.`);
    }
    if (field.type === 'datetime' && !z.iso.datetime().safeParse(value).success) {
      throw new AppError(400, 'validation_error', `${field.label} must be a valid date and time.`);
    }
  }
};

const mergeTask = (current: TaskDocument, patch: TaskPatch, timestamp: string): TaskDocument => ({
  id: current.id,
  organizationId: current.organizationId,
  title: patch.title ?? current.title,
  description: patch.description ?? current.description,
  dueDate: patch.dueDate ?? current.dueDate,
  priority: patch.priority ?? current.priority,
  status: patch.status ?? current.status,
  tags: patch.tags ?? current.tags ?? [],
  customFields: {
    ...(current.customFields ?? {}),
    ...(patch.customFields ?? {}),
  },
  createdAt: current.createdAt || timestamp,
  updatedAt: timestamp,
});

const cloneDefaultSettings = (): FormSettings => ({
  fields: DEFAULT_FORM_SETTINGS.fields.map((field) => ({ ...field })),
  rows: DEFAULT_FORM_SETTINGS.rows.map((row) => ({
    ...row,
    fieldIds: [...row.fieldIds],
  })),
});
