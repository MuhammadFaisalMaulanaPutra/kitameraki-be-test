import type { Container, SqlParameter, SqlQuerySpec } from '@azure/cosmos';
import type { FindTasksOptions, ITaskRepository, PaginatedResult } from '../../interfaces/task.repository.interface';
import type { Task, TaskFilter, TaskSortField } from '../../models/task.model';
import { isCosmosNotFound, stripSystemProperties } from './cosmos.utils';

/** Whitelist mapping: sort fields can't be parameterized in Cosmos SQL, so only known paths are interpolated. */
const SORT_PATHS: Record<TaskSortField, string> = {
  createdAt: 'c.createdAt',
  updatedAt: 'c.updatedAt',
  title: 'c.title',
  dueDate: 'c.dueDate',
};

function toTask(resource: Task): Task {
  const task = stripSystemProperties(resource);
  return { ...task, tags: task.tags ?? [], customFields: task.customFields ?? {} };
}

/**
 * Builds the WHERE clause with query parameters only (no string concatenation of user input),
 * which fixes the SQL injection in the legacy `GetTasks` function.
 */
export function buildWhereClause(
  organizationId: string,
  filter: TaskFilter,
): { where: string; parameters: SqlParameter[] } {
  const conditions = ['c.organizationId = @organizationId'];
  const parameters: SqlParameter[] = [{ name: '@organizationId', value: organizationId }];

  if (filter.status) {
    conditions.push('c.status = @status');
    parameters.push({ name: '@status', value: filter.status });
  }

  if (filter.priority) {
    conditions.push('c.priority = @priority');
    parameters.push({ name: '@priority', value: filter.priority });
  }

  if (filter.tag) {
    conditions.push('ARRAY_CONTAINS(c.tags, @tag)');
    parameters.push({ name: '@tag', value: filter.tag });
  }

  if (filter.search) {
    conditions.push(
      '(CONTAINS(LOWER(c.title), @search)' +
        ' OR CONTAINS(LOWER(c.description), @search)' +
        ' OR EXISTS(SELECT VALUE t FROM t IN c.tags WHERE CONTAINS(LOWER(t), @search)))',
    );
    parameters.push({ name: '@search', value: filter.search.toLowerCase() });
  }

  return { where: conditions.join(' AND '), parameters };
}

export class CosmosTaskRepository implements ITaskRepository {
  constructor(private readonly container: Container) {}

  async findMany(
    organizationId: string,
    { filter, sort, pagination }: FindTasksOptions,
  ): Promise<PaginatedResult<Task>> {
    const { where, parameters } = buildWhereClause(organizationId, filter);
    const direction = sort.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const itemsQuery: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE ${where} ORDER BY ${SORT_PATHS[sort.sortBy]} ${direction} OFFSET @offset LIMIT @limit`,
      parameters: [
        ...parameters,
        { name: '@offset', value: (pagination.page - 1) * pagination.pageSize },
        { name: '@limit', value: pagination.pageSize },
      ],
    };
    const countQuery: SqlQuerySpec = { query: `SELECT VALUE COUNT(1) FROM c WHERE ${where}`, parameters };

    const [itemsResponse, countResponse] = await Promise.all([
      this.container.items.query<Task>(itemsQuery, { partitionKey: organizationId }).fetchAll(),
      this.container.items.query<number>(countQuery, { partitionKey: organizationId }).fetchAll(),
    ]);

    return {
      items: itemsResponse.resources.map(toTask),
      totalItems: countResponse.resources[0] ?? 0,
    };
  }

  async findById(organizationId: string, id: string): Promise<Task | null> {
    try {
      const { resource } = await this.container.item(id, organizationId).read<Task>();
      return resource ? toTask(resource) : null;
    } catch (error) {
      if (isCosmosNotFound(error)) return null;
      throw error;
    }
  }

  async create(task: Task): Promise<Task> {
    const { resource } = await this.container.items.create<Task>(task);
    return toTask(resource ?? task);
  }

  async update(task: Task): Promise<Task> {
    const { resource } = await this.container.item(task.id, task.organizationId).replace<Task>(task);
    return toTask(resource ?? task);
  }

  async delete(organizationId: string, id: string): Promise<boolean> {
    try {
      await this.container.item(id, organizationId).delete();
      return true;
    } catch (error) {
      if (isCosmosNotFound(error)) return false;
      throw error;
    }
  }
}
