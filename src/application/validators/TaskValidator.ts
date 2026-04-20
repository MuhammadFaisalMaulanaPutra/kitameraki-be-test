import { z } from "zod";

const TaskStatus = z.enum(["todo", "doing", "done"]);

export const CreateTaskSchema = z.object({
    organizationId: z.string().min(1),
    title: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    status: TaskStatus.optional().default("todo")
});

export const UpdateTaskSchema = z.object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    status: TaskStatus.optional()
});

export const DeleteTaskSchema = z.object({
    organizationId: z.string().min(1),
    id: z.string().min(1)
});

export const BulkDeleteTasksSchema = z.object({
    organizationId: z.string().min(1),
    ids: z.array(z.string().min(1)).min(1)
});

export const GetTasksSchema = z.object({
    organizationId: z.string().min(1),
    keyword: z.string().optional(),
    filter: z.string().optional(),
    token: z.string().optional()
});

export const GetTaskSchema = z.object({
    organizationId: z.string().min(1),
    id: z.string().min(1)
});