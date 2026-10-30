import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "../lib/errors";
import type { CreateTask, UpdateTask } from "../lib/taskSchema";
import { toTaskDto } from "../mappers/taskMapper";
import * as taskRepository from "../repositories/taskRepository";
import type { TaskDto } from "../types/task";

export async function createTask(input: CreateTask): Promise<TaskDto> {
    const task = await taskRepository.createTask({ id: randomUUID(), ...input });
    return toTaskDto(task);
}

export async function getTask(id: string, organizationId: string): Promise<TaskDto> {
    const task = await taskRepository.readTask(id, organizationId);
    if (!task) {
        throw new NotFoundError();
    }
    return toTaskDto(task);
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
        throw failedOperation.statusCode === 409 ? new ConflictError() : new NotFoundError();
    }
}
