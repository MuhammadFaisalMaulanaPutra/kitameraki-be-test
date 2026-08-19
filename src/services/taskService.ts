import { randomUUID } from 'crypto';
import { PatchOperation } from '@azure/cosmos';
import * as taskRepository from '../repositories/taskRepository';
import { validateCreateTaskInput, validateUpdateTaskInput } from '../middleware/validateSchema';
import { CreateTaskInput, ListTasksQuery, PagedResult, Task, UpdateTaskInput } from '../models/task.types';
import { BadRequestError } from '../utils/errors';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export async function listTasks(query: ListTasksQuery): Promise<PagedResult<Task>> {
    return taskRepository.listTasks({
        ...query,
        pageSize: Math.min(query.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
        page: query.page || 1,
    });
}

export async function getTask(id: string, organizationId: string): Promise<Task> {
    return taskRepository.getTaskById(id, organizationId);
}

export async function createTask(organizationId: string, input: CreateTaskInput): Promise<Task> {
    validateCreateTaskInput(input);

    const task: Task = {
        ...input,
        id: randomUUID(),
        organizationId,
    };

    return taskRepository.createTask(task);
}

/**
 * Builds a JSON Patch document from a partial update, ignoring any
 * `id` / `organizationId` the caller may have tried to include
 * (they are stripped by validation before this point), so a task
 * can never be re-parented to a different organization or given a
 * new id through the update endpoint.
 */
export async function updateTask(
    id: string,
    organizationId: string,
    input: UpdateTaskInput
): Promise<Task> {
    validateUpdateTaskInput(input);

    const entries = Object.entries(input);

    if (entries.length === 0) {
        throw new BadRequestError('Update request must include at least one field to change.');
    }

    const patchOperations: PatchOperation[] = entries.map(([key, value]) => ({
        op: 'add',
        path: `/${key}`,
        value,
    }));

    return taskRepository.updateTask(id, organizationId, patchOperations);
}

export async function deleteTask(id: string, organizationId: string): Promise<void> {
    return taskRepository.deleteTask(id, organizationId);
}

export async function bulkDeleteTasks(ids: unknown, organizationId: string) {
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('Request body must be a non-empty array of task ids.');
    }

    if (!ids.every((id) => typeof id === 'string' && id.trim().length > 0)) {
        throw new BadRequestError('Every task id in the array must be a non-empty string.');
    }

    if (ids.length > 100) {
        throw new BadRequestError('Cannot delete more than 100 tasks in a single request.');
    }

    return taskRepository.bulkDeleteTasks(ids, organizationId);
}