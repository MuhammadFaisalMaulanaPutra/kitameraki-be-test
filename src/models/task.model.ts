import type { JsonValue } from './form-settings.model';

export const TASK_SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'dueDate'] as const;
export type TaskSortField = (typeof TASK_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * Values of non-core form components, keyed by the component key. Groups with a path hold an object,
 * dynamic lists a list of objects, file pickers a list of file references and expressions any JSON value.
 */
export type CustomFieldValues = Record<string, JsonValue>;

/**
 * Status and priority values come from the options configured in the form settings
 * (template: todo / in-progress / completed and low / medium / high).
 */
export interface Task {
  id: string;
  organizationId: string;
  title?: string;
  description?: string;
  /** ISO 8601 date-time, or YYYY-MM-DD when the bound component is a Date. */
  dueDate?: string;
  priority?: string;
  status?: string;
  tags: string[];
  customFields: CustomFieldValues;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilter {
  search?: string;
  status?: string;
  priority?: string;
  tag?: string;
}

export interface TaskSort {
  sortBy: TaskSortField;
  sortOrder: SortOrder;
}

export interface Pagination {
  page: number;
  pageSize: number;
}
