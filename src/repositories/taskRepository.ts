import { tasksContainer } from "../lib/cosmos";
import { getErrorStatusCode } from "../lib/errors";
import { buildTaskListQueries } from "../lib/taskListQuery";
import { buildTaskPatchOperations } from "../lib/taskPatch";
import type { TaskListQuery, UpdateTask } from "../lib/taskSchema";
import type { TaskDocument } from "../types/task";

export async function createTask(task: TaskDocument): Promise<TaskDocument> {
    const { resource } = await tasksContainer.items.create<TaskDocument>(task);
    if (!resource) {
        throw new Error("Cosmos create returned no task resource.");
    }
    return resource;
}

export async function readTask(
    id: string,
    organizationId: string
): Promise<{ task: TaskDocument; etag: string } | undefined> {
    try {
        const response = await tasksContainer.item(id, organizationId).read<TaskDocument>();
        return response.resource ? { task: response.resource, etag: response.etag } : undefined;
    } catch (error) {
        if (getErrorStatusCode(error) === 404) {
            return undefined;
        }
        throw error;
    }
}

export async function listTasks(
    query: TaskListQuery
): Promise<{ tasks: TaskDocument[]; total: number }> {
    const { itemsQuery, countQuery } = buildTaskListQueries(query);
    const [itemsResult, countResult] = await Promise.all([
        tasksContainer.items.query<TaskDocument>(itemsQuery).fetchAll(),
        tasksContainer.items.query<number>(countQuery).fetchAll()
    ]);

    return {
        tasks: itemsResult.resources,
        total: countResult.resources[0] ?? 0
    };
}

export async function updateTask(
    id: string,
    organizationId: string,
    changes: UpdateTask,
    etag?: string
): Promise<TaskDocument> {
    const operations = buildTaskPatchOperations(changes);
    const { resource } = await tasksContainer
        .item(id, organizationId)
        .patch<TaskDocument>(
            operations,
            etag ? { accessCondition: { type: "IfMatch", condition: etag } } : undefined
        );
    if (!resource) {
        throw new Error("Cosmos patch returned no task resource.");
    }
    return resource;
}

export async function deleteTask(id: string, organizationId: string): Promise<void> {
    await tasksContainer.item(id, organizationId).delete();
}

export async function deleteTasks(ids: string[], organizationId: string) {
    return tasksContainer.items.batch(
        ids.map((id) => ({ operationType: "Delete" as const, id })),
        organizationId
    );
}
