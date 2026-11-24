import type { IFileRepository, StoredFile } from '../../src/interfaces/file.repository.interface';
import type { IFormSettingsRepository } from '../../src/interfaces/form-settings.repository.interface';
import type {
  FindTasksOptions,
  ITaskRepository,
  PaginatedResult,
} from '../../src/interfaces/task.repository.interface';
import type { FormSettings } from '../../src/models/form-settings.model';
import type { Task } from '../../src/models/task.model';

/** Test double that mimics the Cosmos repository behaviour (tenant isolation, filtering, paging). */
export class InMemoryTaskRepository implements ITaskRepository {
  readonly tasks = new Map<string, Task>();

  async findMany(
    organizationId: string,
    { filter, sort, pagination }: FindTasksOptions,
  ): Promise<PaginatedResult<Task>> {
    const search = filter.search?.toLowerCase();
    const matches = [...this.tasks.values()].filter(
      (task) =>
        task.organizationId === organizationId &&
        (!filter.status || task.status === filter.status) &&
        (!filter.priority || task.priority === filter.priority) &&
        (!filter.tag || task.tags.includes(filter.tag)) &&
        (!search ||
          (task.title ?? '').toLowerCase().includes(search) ||
          (task.description ?? '').toLowerCase().includes(search) ||
          task.tags.some((tag) => tag.toLowerCase().includes(search))),
    );

    const direction = sort.sortOrder === 'asc' ? 1 : -1;
    matches.sort((a, b) => String(a[sort.sortBy] ?? '').localeCompare(String(b[sort.sortBy] ?? '')) * direction);

    const start = (pagination.page - 1) * pagination.pageSize;
    return { items: matches.slice(start, start + pagination.pageSize), totalItems: matches.length };
  }

  async findById(organizationId: string, id: string): Promise<Task | null> {
    const task = this.tasks.get(id);
    return task && task.organizationId === organizationId ? structuredClone(task) : null;
  }

  async create(task: Task): Promise<Task> {
    this.tasks.set(task.id, JSON.parse(JSON.stringify(task)));
    return structuredClone(this.tasks.get(task.id)!);
  }

  async update(task: Task): Promise<Task> {
    return this.create(task);
  }

  async delete(organizationId: string, id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task || task.organizationId !== organizationId) return false;
    return this.tasks.delete(id);
  }
}

export class InMemoryFormSettingsRepository implements IFormSettingsRepository {
  readonly settings = new Map<string, FormSettings>();

  async findByOrganization(organizationId: string): Promise<FormSettings | null> {
    const settings = this.settings.get(organizationId);
    return settings ? structuredClone(settings) : null;
  }

  async upsert(settings: FormSettings): Promise<FormSettings> {
    this.settings.set(settings.organizationId, structuredClone(settings));
    return structuredClone(settings);
  }
}

/** Mimics the Blob Storage repository: files are stored per organization (`<organizationId>/<id>`). */
export class InMemoryFileRepository implements IFileRepository {
  readonly files = new Map<string, StoredFile>();

  async save(organizationId: string, file: StoredFile): Promise<void> {
    this.files.set(`${organizationId}/${file.id}`, { ...file, content: Buffer.from(file.content) });
  }

  async findById(organizationId: string, id: string): Promise<StoredFile | null> {
    const file = this.files.get(`${organizationId}/${id}`);
    return file ? { ...file, content: Buffer.from(file.content) } : null;
  }
}
