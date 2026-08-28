import path from 'node:path';
import { Page, Task, TaskListQuery } from '../../domain/task';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError';
import { TaskRepository } from '../contracts';
import { JsonFileStore } from './JsonFileStore';

interface JsonPageToken {
  offset: number;
}

export class JsonTaskRepository implements TaskRepository {
  private readonly store: JsonFileStore<Task>;

  constructor(dataDirectory: string) {
    this.store = new JsonFileStore<Task>(path.join(dataDirectory, 'tasks.json'));
  }

  async list(query: TaskListQuery): Promise<Page<Task>> {
    let tasks = (await this.store.read()).filter((task) => task.organizationId === query.organizationId);

    if (query.search) {
      const search = query.search.toLowerCase();
      tasks = tasks.filter((task) => {
        return (
          task.title.toLowerCase().includes(search) ||
          (task.description?.toLowerCase().includes(search) ?? false)
        );
      });
    }

    if (query.status) {
      tasks = tasks.filter((task) => task.status === query.status);
    }

    if (query.priority) {
      tasks = tasks.filter((task) => task.priority === query.priority);
    }

    if (query.tags?.length) {
      tasks = tasks.filter((task) => query.tags!.every((tag) => task.tags?.includes(tag)));
    }

    if (query.sortBy) {
      tasks.sort((left, right) => compareTasks(left, right, query));
    }

    const offset = decodePageToken(query.pageToken);
    const items = tasks.slice(offset, offset + query.pageSize);
    const nextOffset = offset + items.length;

    return {
      items,
      nextPageToken: nextOffset < tasks.length ? encodePageToken({ offset: nextOffset }) : null,
    };
  }

  async getById(id: string, organizationId: string): Promise<Task | null> {
    const tasks = await this.store.read();
    return tasks.find((task) => task.id === id && task.organizationId === organizationId) ?? null;
  }

  async create(task: Task): Promise<Task> {
    return this.store.update((tasks) => {
      if (tasks.some((candidate) => candidate.id === task.id && candidate.organizationId === task.organizationId)) {
        throw new ConflictError('A task with the same id already exists.');
      }
      tasks.push(task);
      return task;
    });
  }

  async replace(task: Task): Promise<Task> {
    return this.store.update((tasks) => {
      const index = tasks.findIndex(
        (candidate) => candidate.id === task.id && candidate.organizationId === task.organizationId,
      );
      if (index < 0) {
        throw new NotFoundError('Task not found.');
      }
      tasks[index] = task;
      return task;
    });
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    return this.store.update((tasks) => {
      const index = tasks.findIndex((task) => task.id === id && task.organizationId === organizationId);
      if (index < 0) {
        return false;
      }
      tasks.splice(index, 1);
      return true;
    });
  }
}

function compareTasks(left: Task, right: Task, query: TaskListQuery): number {
  const sortBy = query.sortBy ?? 'createdAt';
  const direction = query.sortDirection === 'asc' ? 1 : -1;
  const leftValue = left[sortBy] ?? '';
  const rightValue = right[sortBy] ?? '';
  return String(leftValue).localeCompare(String(rightValue)) * direction;
}

function encodePageToken(token: JsonPageToken): string {
  return Buffer.from(JSON.stringify(token), 'utf8').toString('base64url');
}

function decodePageToken(token?: string): number {
  if (!token) {
    return 0;
  }

  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as Partial<JsonPageToken>;
    if (!Number.isInteger(parsed.offset) || (parsed.offset ?? -1) < 0) {
      throw new Error('Invalid offset.');
    }
    return parsed.offset!;
  } catch {
    throw new ValidationError([{ field: 'pageToken', message: 'pageToken is invalid.' }]);
  }
}
