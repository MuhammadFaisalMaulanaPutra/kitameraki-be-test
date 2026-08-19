export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'completed';

/**
 * Full Task entity as stored in Cosmos DB.
 * Kept in sync with `task.schema.json` at the repo root.
 */
export interface Task {
    id: string;
    organizationId: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority?: TaskPriority;
    status: TaskStatus;
    tags?: string[];
}

/**
 * Fields a client is allowed to send when creating a task.
 * `id` is generated server-side; `organizationId` is taken from
 * the authenticated context, never trusted from the request body.
 */
export type CreateTaskInput = Omit<Task, 'id' | 'organizationId'>;

/**
 * Fields a client is allowed to modify on an existing task.
 * `id` and `organizationId` are intentionally excluded so a caller
 * can never move a task to a different organization or change its id.
 */
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'organizationId'>>;

/**
 * Query parameters accepted by the list-tasks endpoint.
 */
export interface ListTasksQuery {
    organizationId: string;
    search?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    page: number;
    pageSize: number;
}

export interface PagedResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    hasMore: boolean;
}