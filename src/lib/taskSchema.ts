import { z } from "zod";

export const uuidSchema = z.string().uuid();

const taskFields = {
    title: z.string().trim().min(1).max(100),
    description: z.string().max(1000).optional(),
    dueDate: z.string().datetime({ offset: true }).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    status: z.enum(["todo", "in-progress", "completed"]),
    tags: z.array(z.string().max(50)).optional()
};

export const createTaskSchema = z.object({
    organizationId: uuidSchema,
    ...taskFields
}).strict();

export const updateTaskSchema = z.object(taskFields)
    .partial()
    .strict()
    .refine(task => Object.keys(task).length > 0, {
        message: "At least one task field is required."
    });

export const taskParamsSchema = z.object({
    id: uuidSchema,
    organizationId: uuidSchema
});

export const bulkDeleteSchema = z.array(uuidSchema)
    .min(1)
    .max(100)
    .refine(ids => new Set(ids).size === ids.length, {
        message: "Task ids must be unique."
    });

export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
