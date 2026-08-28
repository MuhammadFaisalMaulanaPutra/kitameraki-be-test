import { FormSettings } from '../domain/formSettings';
import { Page, Task, TaskListQuery } from '../domain/task';

export interface TaskRepository {
  list(query: TaskListQuery): Promise<Page<Task>>;
  getById(id: string, organizationId: string): Promise<Task | null>;
  create(task: Task): Promise<Task>;
  replace(task: Task): Promise<Task>;
  delete(id: string, organizationId: string): Promise<boolean>;
}

export interface FormSettingsRepository {
  get(organizationId: string): Promise<FormSettings | null>;
  save(settings: FormSettings): Promise<FormSettings>;
}
