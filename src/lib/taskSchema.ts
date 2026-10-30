import { z } from "zod";

export const uuidSchema = z.uuid();
export const prioritySchema = z.enum(["low", "medium", "high"]);
export const statusSchema = z.enum(["todo", "in-progress", "completed"]);

const taskFields = {
    title: z.string().trim().min(1).max(100),
    description: z.string().max(1000).optional(),
    dueDate: z.iso.datetime({ offset: true }).optional(),
    priority: prioritySchema.optional(),
    status: statusSchema,
    tags: z.array(z.string().max(50)).optional(),
    customFields: z.record(z.string().min(1).max(100), z.string()).optional()
};

export const createTaskSchema = z.strictObject({
    organizationId: uuidSchema,
    ...taskFields
});

export const updateTaskSchema = z.strictObject(taskFields)
    .partial()
    .refine(task => Object.keys(task).length > 0, {
        message: "At least one task field is required."
    });

export const taskParamsSchema = z.strictObject({
    id: uuidSchema,
    organizationId: uuidSchema
});

export const organizationParamsSchema = z.strictObject({
    organizationId: uuidSchema
});

export const bulkDeleteSchema = z.array(uuidSchema)
    .min(1)
    .max(100)
    .refine(ids => new Set(ids).size === ids.length, {
        message: "Task ids must be unique."
    });

export const taskListQuerySchema = z.strictObject({
    organizationId: uuidSchema,
    search: z.preprocess(
        value => value === "" ? undefined : value,
        z.string().trim().min(1).max(100).optional()
    ),
    status: z.preprocess(
        value => value === "" ? undefined : value,
        statusSchema.optional()
    ),
    priority: z.preprocess(
        value => value === "" ? undefined : value,
        prioritySchema.optional()
    ),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
