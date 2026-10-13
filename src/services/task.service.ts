import { randomUUID } from 'node:crypto';
import { TaskRepository, taskRepository } from '../repositories/task.repository.js';
import { Task } from '../models/task.model.js';
import { PaginatedTasksDTO } from '../dtos/task.dto.js';
import { BadRequestError, NotFoundError } from '../utils/errors.util.js';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskFilterSchema,
  BulkDeleteTaskSchema,
  validateWithZod,
} from '../validators/task.validator.js';

export class TaskService {
  constructor(private readonly repo: TaskRepository = taskRepository) {}

  async getTasks(filterInput: unknown): Promise<PaginatedTasksDTO> {
    const validatedFilter = validateWithZod(TaskFilterSchema, filterInput);
    return this.repo.findWithFilters(validatedFilter);
  }

  private validateRequiredParams(id: string, organizationId: string): void {
    if (!id || !organizationId) {
      throw new BadRequestError('Parameter id dan organizationId wajib diisi!');
    }
  }

  async getTaskById(id: string, organizationId: string): Promise<Task> {
    this.validateRequiredParams(id, organizationId);
    const task = await this.repo.findById(id, organizationId);
    if (!task) throw new NotFoundError(`Task dengan ID '${id}' tidak ditemukan.`);
    return task;
  }

  async createTask(input: unknown): Promise<Task> {
    const validatedData = validateWithZod(CreateTaskSchema, input);
    const now = new Date().toISOString();

    const newTask: Task = {
      id: randomUUID(),
      ...validatedData,
      createdAt: now,
      updatedAt: now,
    };

    return this.repo.create(newTask);
  }

  async updateTask(id: string, organizationId: string, input: unknown): Promise<Task> {
    this.validateRequiredParams(id, organizationId);
    const validatedUpdates = validateWithZod(UpdateTaskSchema, input);
    const existingTask = await this.repo.findById(id, organizationId);
    if (!existingTask) throw new NotFoundError(`Task dengan ID '${id}' tidak ditemukan untuk diperbarui.`);
    const updatedTask = await this.repo.update(id, organizationId, validatedUpdates);
    if (!updatedTask) throw new NotFoundError(`Gagal memperbarui task dengan ID '${id}'.`);
    return updatedTask;
  }

  async deleteTask(id: string, organizationId: string): Promise<void> {
    this.validateRequiredParams(id, organizationId);
    const success = await this.repo.delete(id, organizationId);
    if (!success) throw new NotFoundError(`Task dengan ID '${id}' tidak ditemukan untuk dihapus.`);
  }

  async bulkDeleteTasks(idsInput: unknown, organizationId: string): Promise<{ deletedCount: number }> {
    if (!organizationId) throw new BadRequestError('Parameter organizationId wajib diisi!');
    const ids = validateWithZod(BulkDeleteTaskSchema, idsInput);
    const deletedCount = await this.repo.bulkDelete(ids, organizationId);
    return { deletedCount };
  }
}

export const taskService = new TaskService();