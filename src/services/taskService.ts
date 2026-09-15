import { SqlQuerySpec } from "@azure/cosmos";
import { tasksContainer } from "../config/cosmos";
import { Task } from "../models/Task";

export async function getTasks(organizationId: string): Promise<Task[]> {
    const query: SqlQuerySpec = {
        query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
        parameters: [
            {
                name: "@organizationId",
                value: organizationId,
            },
        ],
    };

    const { resources } = await tasksContainer.items
        .query<Task>(query)
        .fetchAll();

    return resources;
}

export async function getTask(
    id: string,
    organizationId: string
): Promise<Task | null> {
    try {
        const { resource } = await tasksContainer
            .item(id, organizationId)
            .read<Task>();

        return resource ?? null;
    } catch (error: any) {
        if (error.code === 404) {
            return null;
        }

        throw error;
    }
}

export async function createTask(task: Task): Promise<Task> {
    const { resource } = await tasksContainer.items.create<Task>(task);

    if (!resource) {
        throw new Error("Failed to create task");
    }

    return resource;
}

export async function updateTask(
    id: string,
    organizationId: string,
    updates: Partial<Task>
): Promise<Task | null> {
    const existingTask = await getTask(id, organizationId);

    if (!existingTask) {
        return null;
    }

    const updatedTask: Task = {
        ...existingTask,
        ...updates,
        id: existingTask.id,
        organizationId: existingTask.organizationId,
    };

    const { resource } = await tasksContainer
        .item(id, organizationId)
        .replace<Task>(updatedTask);

    return resource ?? null;
}

export async function deleteTask(
    id: string,
    organizationId: string
): Promise<boolean> {
    try {
        await tasksContainer.item(id, organizationId).delete();
        return true;
    } catch (error: any) {
        if (error.code === 404) {
            return false;
        }

        throw error;
    }
}