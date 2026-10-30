import type { CreateTask } from "../lib/taskSchema";

export type TaskCustomFields = Record<string, string>;
export type TaskDocument = Omit<CreateTask, "customFields"> & {
    id: string;
    createdAt?: string;
    customFields?: TaskCustomFields;
};

export interface TaskDto {
    id: string;
    organizationId: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority?: CreateTask["priority"];
    status: CreateTask["status"];
    tags?: string[];
    customFields?: TaskCustomFields;
    createdAt?: string;
}

export interface TaskListDto {
    items: TaskDto[];
    total: number;
    page: number;
    pageSize: number;
}
