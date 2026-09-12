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

export interface CreateTaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  customFields?: Record<string, string>;
}

export const formFieldTypes = ['text', 'date', 'datetime', 'email'] as const;
export type FormFieldType = (typeof formFieldTypes)[number];

export interface FormField {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  visible: boolean;
  required: boolean;
  column: 1 | 2;
  order: number;
  system: boolean;
}

export interface FormSettings {
  id: 'form-settings';
  fields: FormField[];
  updatedAt: string;
}

export const defaultFormSettings: FormSettings = {
  id: 'form-settings',
  updatedAt: '',
  fields: [
    { id: 'title', key: 'title', label: 'Title', type: 'text', visible: true, required: true, column: 1, order: 0, system: true },
    { id: 'description', key: 'description', label: 'Description', type: 'text', visible: true, required: false, column: 1, order: 1, system: true },
    { id: 'status', key: 'status', label: 'Status', type: 'text', visible: true, required: true, column: 2, order: 2, system: true },
    { id: 'priority', key: 'priority', label: 'Priority', type: 'text', visible: true, required: true, column: 2, order: 3, system: true },
    { id: 'dueDate', key: 'dueDate', label: 'Due date', type: 'datetime', visible: true, required: false, column: 2, order: 4, system: true }
  ]
};

export interface TaskQuery {
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
