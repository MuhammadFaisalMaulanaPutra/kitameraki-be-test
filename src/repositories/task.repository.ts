import { Container } from '@azure/cosmos';
import { Task, TaskListQuery, PaginatedTasks } from '../models/task.model';
import { isCosmosNotFound, NotFoundError } from '../shared/errors';
import { TaskRepositoryPort } from './task-repository.interface';

export class TaskRepository implements TaskRepositoryPort {
  constructor(private readonly container: Container) {}

  async findAll(query: TaskListQuery): Promise<PaginatedTasks> {
    const filters: string[] = [];
    const parameters: Array<{ name: string; value: string | number }> = [];

    if (query.search) {
      filters.push('(CONTAINS(LOWER(c.title), @search) OR CONTAINS(LOWER(c.description), @search))');
      parameters.push({ name: '@search', value: query.search.toLowerCase() });
    }
    if (query.status) {
      filters.push('c.status = @status');
      parameters.push({ name: '@status', value: query.status });
    }
    if (query.priority) {
      filters.push('c.priority = @priority');
      parameters.push({ name: '@priority', value: query.priority });
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const countQuery = `SELECT VALUE COUNT(1) FROM c ${whereClause}`;
    const dataQuery = `SELECT * FROM c ${whereClause} ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit`;
    const offset = (query.page - 1) * query.pageSize;

    const [countResult, dataResult] = await Promise.all([
      this.container.items.query<number>({ query: countQuery, parameters }).fetchAll(),
      this.container.items.query<Task>({
        query: dataQuery,
        parameters: [
          ...parameters,
          { name: '@offset', value: offset },
          { name: '@limit', value: query.pageSize }
        ]
      }).fetchAll()
    ]);

    const total = countResult.resources[0] ?? 0;
    return {
      items: dataResult.resources,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize)
    };
  }

  async findById(id: string): Promise<Task> {
    try {
      const { resource } = await this.container.item(id, id).read<Task>();
      if (!resource) throw new NotFoundError('Task not found');
      return resource;
    } catch (error) {
      if (isCosmosNotFound(error)) throw new NotFoundError('Task not found');
      throw error;
    }
  }

  async create(task: Task): Promise<Task> {
    const { resource } = await this.container.items.create<Task>(task);
    if (!resource) throw new Error('Cosmos DB did not return the created task');
    return resource;
  }

  async update(task: Task): Promise<Task> {
    try {
      const { resource } = await this.container.item(task.id, task.id).replace<Task>(task);
      if (!resource) throw new Error('Cosmos DB did not return the updated task');
      return resource;
    } catch (error) {
      if (isCosmosNotFound(error)) throw new NotFoundError('Task not found');
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.container.item(id, id).delete();
    } catch (error) {
      if (isCosmosNotFound(error)) throw new NotFoundError('Task not found');
      throw error;
    }
  }
}
