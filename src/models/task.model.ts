export const taskStatuses = ['todo', 'in-progress', 'done'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskPriorities = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  customFields?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListQuery {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  page: number;
  pageSize: number;
}

export interface PaginatedTasks {
  items: Task[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
