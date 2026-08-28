export const TASK_STATUSES = ['todo', 'in-progress', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_SORT_FIELDS = [
  'title',
  'dueDate',
  'priority',
  'status',
  'createdAt',
  'updatedAt',
] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];
export type SortDirection = 'asc' | 'desc';

export type CustomFieldValues = Record<string, unknown>;

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  status: TaskStatus;
  tags?: string[];
  customFields?: CustomFieldValues;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  status: TaskStatus;
  tags?: string[];
  customFields?: CustomFieldValues;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority | null;
  status?: TaskStatus;
  tags?: string[] | null;
  customFields?: CustomFieldValues;
}

export interface TaskListQuery {
  organizationId: string;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  pageSize: number;
  pageToken?: string;
  sortBy?: TaskSortField;
  sortDirection: SortDirection;
}

export interface Page<T> {
  items: T[];
  nextPageToken: string | null;
}
