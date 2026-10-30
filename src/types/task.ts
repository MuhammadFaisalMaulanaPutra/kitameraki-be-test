import type { CreateTask } from "../lib/taskSchema";

export type TaskDocument = CreateTask & { id: string };

export interface TaskDto {
    id: string;
    organizationId: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority?: CreateTask["priority"];
    status: CreateTask["status"];
    tags?: string[];
}
