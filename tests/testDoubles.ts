import { FormSettings } from '../src/domain/formSettings';
import { Page, Task, TaskListQuery } from '../src/domain/task';
import { FormSettingsRepository, TaskRepository } from '../src/repositories/contracts';

export class InMemoryTaskRepository implements TaskRepository {
  readonly items: Task[] = [];

  async list(query: TaskListQuery): Promise<Page<Task>> {
    return {
      items: this.items.filter((task) => task.organizationId === query.organizationId),
      nextPageToken: null,
    };
  }

  async getById(id: string, organizationId: string): Promise<Task | null> {
    return this.items.find((task) => task.id === id && task.organizationId === organizationId) ?? null;
  }

  async create(task: Task): Promise<Task> {
    this.items.push(structuredClone(task));
    return structuredClone(task);
  }

  async replace(task: Task): Promise<Task> {
    const index = this.items.findIndex(
      (candidate) => candidate.id === task.id && candidate.organizationId === task.organizationId,
    );
    if (index < 0) {
      throw new Error('Task does not exist.');
    }
    this.items[index] = structuredClone(task);
    return structuredClone(task);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const index = this.items.findIndex((task) => task.id === id && task.organizationId === organizationId);
    if (index < 0) {
      return false;
    }
    this.items.splice(index, 1);
    return true;
  }
}

export class InMemoryFormSettingsRepository implements FormSettingsRepository {
  readonly items = new Map<string, FormSettings>();

  async get(organizationId: string): Promise<FormSettings | null> {
    const value = this.items.get(organizationId);
    return value ? structuredClone(value) : null;
  }

  async save(settings: FormSettings): Promise<FormSettings> {
    this.items.set(settings.organizationId, structuredClone(settings));
    return structuredClone(settings);
  }
}
