import { randomUUID } from 'node:crypto';
import { Task, TaskListQuery, PaginatedTasks } from '../models/task.model';
import { TaskRepository } from '../repositories/task.repository';
import { createTaskSchema, updateTaskSchema } from '../validators/task.validator';
import { ValidationError } from '../shared/errors';
import { TaskRepositoryPort } from '../repositories/task-repository.interface';
import { FormSettingsRepositoryPort } from '../repositories/form-settings-repository.interface';
import { FormField } from '../models/form-settings.model';

export class TaskService {
  constructor(
    private readonly repository: TaskRepositoryPort,
    private readonly formSettingsRepository: FormSettingsRepositoryPort
  ) {}

  findAll(query: TaskListQuery): Promise<PaginatedTasks> {
    return this.repository.findAll(query);
  }

  findById(id: string): Promise<Task> {
    return this.repository.findById(id);
  }

  async create(input: unknown): Promise<Task> {
    const result = createTaskSchema.safeParse(input);
    if (!result.success) throw new ValidationError(result.error.issues.map((issue) => issue.message).join(', '));
    await this.validateCustomFields(result.data.customFields, true);

    const now = new Date().toISOString();
    return this.repository.create({
      id: randomUUID(),
      ...result.data,
      createdAt: now,
      updatedAt: now
    });
  }

  async update(id: string, input: unknown): Promise<Task> {
    const result = updateTaskSchema.safeParse(input);
    if (!result.success) throw new ValidationError(result.error.issues.map((issue) => issue.message).join(', '));
    if (result.data.customFields) await this.validateCustomFields(result.data.customFields, false);

    const current = await this.repository.findById(id);
    return this.repository.update({
      ...current,
      ...result.data,
      dueDate: result.data.dueDate === null ? undefined : result.data.dueDate,
      updatedAt: new Date().toISOString()
    });
  }

  delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  private async validateCustomFields(values: Record<string, string> | undefined, enforceRequired: boolean): Promise<void> {
    const settings = await this.formSettingsRepository.find();
    const customFields = settings?.fields.filter((field) => !field.system) ?? [];
    const allowedFields = new Map(customFields.map((field) => [field.key, field]));
    const providedValues = values ?? {};
    const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);

    for (const [key, value] of Object.entries(providedValues)) {
      const field = allowedFields.get(key);
      if (!field || forbiddenKeys.has(key)) throw new ValidationError(`Unknown custom field: ${key}`);
      this.validateCustomFieldValue(field, value);
    }

    if (enforceRequired) {
      const missing = customFields.find((field) => field.visible && field.required && !providedValues[field.key]?.trim());
      if (missing) throw new ValidationError(`${missing.label} is required`);
    }
  }

  private validateCustomFieldValue(field: FormField, value: string): void {
    if (field.type === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
      throw new ValidationError(`${field.label} must be a valid email`);
    }
    if ((field.type === 'date' || field.type === 'datetime') && Number.isNaN(Date.parse(value))) {
      throw new ValidationError(`${field.label} must be a valid date`);
    }
  }
}
