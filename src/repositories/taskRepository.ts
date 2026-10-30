import { tasksContainer } from "../lib/cosmos";
import type { UpdateTask } from "../lib/taskSchema";
import type { TaskDocument } from "../types/task";

export async function createTask(task: TaskDocument): Promise<TaskDocument> {
    const { resource } = await tasksContainer.items.create<TaskDocument>(task);
    if (!resource) {
        throw new Error("Cosmos create returned no task resource.");
    }
    return resource;
}

export async function readTask(id: string, organizationId: string): Promise<TaskDocument | undefined> {
    const { resource } = await tasksContainer.item(id, organizationId).read<TaskDocument>();
    return resource;
}

export async function listTasks(organizationId: string): Promise<TaskDocument[]> {
    const { resources } = await tasksContainer.items
        .query<TaskDocument>({
            query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
            parameters: [{ name: "@organizationId", value: organizationId }]
        })
        .fetchNext();

    return resources;
}

export async function updateTask(
    id: string,
    organizationId: string,
    changes: UpdateTask
): Promise<TaskDocument> {
    const operations = Object.entries(changes).map(([key, value]) => ({
        op: "set" as const,
        path: `/${key}`,
        value
    }));
    const { resource } = await tasksContainer.item(id, organizationId).patch<TaskDocument>(operations);
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
        ids.map(id => ({ operationType: "Delete" as const, id })),
        organizationId
    );
}
