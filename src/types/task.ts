export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'completed';

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags?: string[];
  dynamicData?: Record<string, any>;
}

export type CreateTaskPayload = Omit<Task, 'id'>;
export type UpdateTaskPayload = Partial<Omit<Task, 'id' | 'organizationId'>>;
