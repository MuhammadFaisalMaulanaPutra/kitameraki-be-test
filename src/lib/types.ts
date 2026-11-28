// status and priority
export const TASK_STATUSES = ["todo", "in-progress", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// field types
export const CUSTOM_FIELD_TYPES = ["text", "date", "datetime", "email"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export type BuiltInFieldType = "textarea" | "status" | "priority" | "tags";
export type FieldType = CustomFieldType | BuiltInFieldType;

// task stored in cosmos
export interface Task {
  id: string;
  organizationId: string; // partition key
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority | null;
  status: TaskStatus;
  tags: string[];
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority | null;
  status?: TaskStatus;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
}

export interface FormRow {
  id: string;
  fields: FormField[];
}

export interface FormSettings {
  id: string;
  organizationId: string;
  rows: FormRow[];
  updatedAt: string;
}

export interface TaskListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}
