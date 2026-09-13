import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);
export const taskStatusSchema = z.enum(["todo", "in-progress", "completed"]);

export const createTaskSchema = z.object({
    organizationId: z.string().uuid(),
    title: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    dueDate: z.string().datetime().optional(),
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema,
    tags: z.array(z.string().max(50)).optional(),
}).catchall(z.unknown());

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;