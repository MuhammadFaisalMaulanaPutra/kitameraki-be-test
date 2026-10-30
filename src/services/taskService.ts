import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, ValidationError } from "../lib/errors";
import { customFieldValueSchemas } from "../lib/formSettingsSchema";
import type { CreateTask, TaskListQuery, UpdateTask } from "../lib/taskSchema";
import { toTaskDto } from "../mappers/taskMapper";
import * as taskRepository from "../repositories/taskRepository";
import type { TaskDto, TaskListDto } from "../types/task";
import { getFormSettings } from "./formSettingsService";

async function validateCustomFields(
    organizationId: string,
    customFields: Record<string, string> | undefined
): Promise<void> {
    if (!customFields || Object.keys(customFields).length === 0) {
        return;
    }

    const settings = await getFormSettings(organizationId);
    const messages: string[] = [];

    for (const [fieldId, value] of Object.entries(customFields)) {
        const field = settings.fields.find(candidate => candidate.id === fieldId);
        if (!field || field.builtIn) {
            messages.push(`Unknown custom field: ${fieldId}.`);
            continue;
        }

        const result = customFieldValueSchemas[field.type].safeParse(value);
        if (!result.success) {
            messages.push(`${field.label}: ${result.error.issues[0]?.message ?? "Invalid value."}`);
        }
    }

    if (messages.length > 0) {
        throw new ValidationError({
            formErrors: [],
            fieldErrors: { customFields: messages }
        });
    }
}

export async function createTask(input: CreateTask): Promise<TaskDto> {
    await validateCustomFields(input.organizationId, input.customFields);
    const task = await taskRepository.createTask({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        ...input
    });
    return toTaskDto(task);
}

export async function getTask(id: string, organizationId: string): Promise<TaskDto> {
    const task = await taskRepository.readTask(id, organizationId);
    if (!task) {
        throw new NotFoundError();
    }
    return toTaskDto(task);
}

export async function getTasks(query: TaskListQuery): Promise<TaskListDto> {
    const { tasks, total } = await taskRepository.listTasks(query);
    return {
        items: tasks.map(toTaskDto),
        total,
        page: query.page,
        pageSize: query.pageSize
    };
}

export async function updateTask(
    id: string,
    organizationId: string,
    changes: UpdateTask
): Promise<TaskDto> {
    await validateCustomFields(organizationId, changes.customFields);
    const task = await taskRepository.updateTask(id, organizationId, changes);
    return toTaskDto(task);
}

export async function deleteTask(id: string, organizationId: string): Promise<void> {
    await taskRepository.deleteTask(id, organizationId);
}

export async function bulkDeleteTasks(ids: string[], organizationId: string): Promise<void> {
    const batchResult = await taskRepository.deleteTasks(ids, organizationId);

    if (!batchResult.result) {
        throw new Error("Cosmos batch returned no operation results.");
    }

    const failedOperation = batchResult.result.find(operation => operation.statusCode >= 400);
    if (failedOperation) {
        throw failedOperation.statusCode === 409 ? new ConflictError() : new NotFoundError();
    }
}
