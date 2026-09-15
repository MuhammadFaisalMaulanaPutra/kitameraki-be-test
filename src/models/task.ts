export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in-progress" | "completed";

export interface Task {
    id: string;
    organizationId: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority?: TaskPriority;
    status: TaskStatus;
    tags?: string[];
    // Values for fields the organization added through the form settings
    // page, keyed by the field's `key` (see models/formSettings.ts).
    customFields?: Record<string, string | null>;
}

export const TASK_FIELDS = [
    "id",
    "organizationId",
    "title",
    "description",
    "dueDate",
    "priority",
    "status",
    "tags",
    "customFields",
] as const;

export const IMMUTABLE_TASK_FIELDS = ["id", "organizationId"] as const;
