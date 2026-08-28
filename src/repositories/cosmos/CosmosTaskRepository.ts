import { SqlParameter, SqlQuerySpec } from '@azure/cosmos';
import { Page, Task, TaskListQuery } from '../../domain/task';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError';
import { TaskRepository } from '../contracts';
import { getTasksContainer } from './cosmosClient';

const SORT_FIELD_TO_COSMOS_PROPERTY: Record<NonNullable<TaskListQuery['sortBy']>, string> = {
  title: 'title',
  dueDate: 'dueDate',
  priority: 'priority',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

export class CosmosTaskRepository implements TaskRepository {
  async list(query: TaskListQuery): Promise<Page<Task>> {
    const container = getTasksContainer();
    const parameters: SqlParameter[] = [{ name: '@organizationId', value: query.organizationId }];
    const conditions = ['c.organizationId = @organizationId'];

    if (query.search) {
      conditions.push('(CONTAINS(c.title, @search, true) OR CONTAINS(c.description, @search, true))');
      parameters.push({ name: '@search', value: query.search });
    }

    if (query.status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: query.status });
    }

    if (query.priority) {
      conditions.push('c.priority = @priority');
      parameters.push({ name: '@priority', value: query.priority });
    }

    query.tags?.forEach((tag, index) => {
      const parameterName = `@tag${index}`;
      conditions.push(`ARRAY_CONTAINS(c.tags, ${parameterName})`);
      parameters.push({ name: parameterName, value: tag });
    });

    const orderBy = query.sortBy
      ? ` ORDER BY c.${SORT_FIELD_TO_COSMOS_PROPERTY[query.sortBy]} ${query.sortDirection === 'asc' ? 'ASC' : 'DESC'}`
      : '';
    const sql = `SELECT * FROM c WHERE ${conditions.join(' AND ')}${orderBy}`;
    const querySpec: SqlQuerySpec = { query: sql, parameters };

    try {
      const response = await container.items
        .query<Task>(querySpec, {
          partitionKey: query.organizationId,
          maxItemCount: query.pageSize,
          continuationToken: query.pageToken,
        })
        .fetchNext();

      return {
        items: response.resources,
        nextPageToken: response.continuationToken ?? null,
      };
    } catch (error) {
      if (query.pageToken && getStatusCode(error) === 400) {
        throw new ValidationError([{ field: 'pageToken', message: 'pageToken is invalid.' }]);
      }
      throw error;
    }
  }

  async getById(id: string, organizationId: string): Promise<Task | null> {
    try {
      const response = await getTasksContainer().item(id, organizationId).read<Task>();
      return response.resource ?? null;
    } catch (error) {
      if (getStatusCode(error) === 404) {
        return null;
      }
      throw error;
    }
  }

  async create(task: Task): Promise<Task> {
    try {
      const response = await getTasksContainer().items.create<Task>(task);
      if (!response.resource) {
        throw new Error('Cosmos DB did not return the created task.');
      }
      return response.resource;
    } catch (error) {
      if (getStatusCode(error) === 409) {
        throw new ConflictError('A task with the same id already exists.');
      }
      throw error;
    }
  }

  async replace(task: Task): Promise<Task> {
    try {
      const response = await getTasksContainer().item(task.id, task.organizationId).replace<Task>(task);
      if (!response.resource) {
        throw new Error('Cosmos DB did not return the updated task.');
      }
      return response.resource;
    } catch (error) {
      if (getStatusCode(error) === 404) {
        throw new NotFoundError('Task not found.');
      }
      throw error;
    }
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    try {
      await getTasksContainer().item(id, organizationId).delete();
      return true;
    } catch (error) {
      if (getStatusCode(error) === 404) {
        return false;
      }
      throw error;
    }
  }
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const candidate = error as { code?: unknown; statusCode?: unknown };
  if (typeof candidate.code === 'number') return candidate.code;
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  return undefined;
}
