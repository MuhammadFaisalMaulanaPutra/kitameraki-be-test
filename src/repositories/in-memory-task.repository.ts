import { Task, TaskListQuery, PaginatedTasks } from '../models/task.model';
import { NotFoundError } from '../shared/errors';
import { TaskRepositoryPort } from './task-repository.interface';

export class InMemoryTaskRepository implements TaskRepositoryPort {
  private readonly tasks = new Map<string, Task>();

  async findAll(query: TaskListQuery): Promise<PaginatedTasks> {
    const search = query.search?.toLowerCase();
    const filtered = [...this.tasks.values()]
      .filter((task) => !search || task.title.toLowerCase().includes(search) || task.description?.toLowerCase().includes(search))
      .filter((task) => !query.status || task.status === query.status)
      .filter((task) => !query.priority || task.priority === query.priority)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const offset = (query.page - 1) * query.pageSize;
    const items = filtered.slice(offset, offset + query.pageSize);

    return { items, page: query.page, pageSize: query.pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / query.pageSize) };
  }

  async findById(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new NotFoundError('Task not found');
    return task;
  }

  async create(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return task;
  }

  async update(task: Task): Promise<Task> {
    await this.findById(task.id);
    this.tasks.set(task.id, task);
    return task;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    this.tasks.delete(id);
  }
}
