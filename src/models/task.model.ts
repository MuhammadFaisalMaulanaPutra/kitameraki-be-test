export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'completed';

export interface Task {
    id: string;
    organizationId: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority?: TaskPriority;
    status: TaskStatus;
    tags?: string[];
    customFields?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}