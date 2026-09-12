import { Task, TaskListQuery, PaginatedTasks } from '../models/task.model';

export interface TaskRepositoryPort {
  findAll(query: TaskListQuery): Promise<PaginatedTasks>;
  findById(id: string): Promise<Task>;
  create(task: Task): Promise<Task>;
  update(task: Task): Promise<Task>;
  delete(id: string): Promise<void>;
}
