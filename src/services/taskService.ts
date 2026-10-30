import { randomUUID } from "node:crypto";
import { HttpError } from "../lib/http";
import type { CreateTask, UpdateTask } from "../lib/taskSchema";
import { toTaskDto } from "../mappers/taskMapper";
import * as taskRepository from "../repositories/taskRepository";
import type { TaskDto } from "../types/task";

export async function createTask(input: CreateTask): Promise<TaskDto> {
    const task = await taskRepository.createTask({ id: randomUUID(), ...input });
    return toTaskDto(task);
}

export async function getTask(id: string, organizationId: string): Promise<TaskDto | undefined> {
    const task = await taskRepository.readTask(id, organizationId);
    return task ? toTaskDto(task) : undefined;
}

export async function getTasks(organizationId: string): Promise<TaskDto[]> {
    const tasks = await taskRepository.listTasks(organizationId);
    return tasks.map(toTaskDto);
}

export async function updateTask(
    id: string,
    organizationId: string,
    changes: UpdateTask
): Promise<TaskDto> {
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
        const statusCode = failedOperation.statusCode === 409 ? 409 : 404;
        throw new HttpError(
            statusCode,
            statusCode === 409 ? "CONFLICT" : "NOT_FOUND",
            statusCode === 409 ? "Resource conflict." : "Resource not found."
        );
    }
}
