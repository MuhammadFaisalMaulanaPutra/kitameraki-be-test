import type { Pagination, Task, TaskFilter, TaskSort } from '../models/task.model';

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
}

export interface FindTasksOptions {
  filter: TaskFilter;
  sort: TaskSort;
  pagination: Pagination;
}

/**
 * Persistence contract for tasks. Services depend on this abstraction only,
 * so the storage (Cosmos DB, in-memory, ...) can be swapped without touching business logic.
 */
export interface ITaskRepository {
  findMany(organizationId: string, options: FindTasksOptions): Promise<PaginatedResult<Task>>;
  findById(organizationId: string, id: string): Promise<Task | null>;
  create(task: Task): Promise<Task>;
  update(task: Task): Promise<Task>;
  /** @returns `false` when the task does not exist. */
  delete(organizationId: string, id: string): Promise<boolean>;
}
