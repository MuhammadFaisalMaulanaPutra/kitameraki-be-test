import { z } from 'zod';

/**
 * Validation schemas for the task API. Every request body / query is parsed
 * through these before touching the database, so the handlers never trust raw
 * client input (the original code inserted the request body verbatim).
 */

export const taskStatusSchema = z.enum(['todo', 'in-progress', 'completed']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high']);

/**
 * Custom fields (Part 2) are user-defined at runtime, so their keys are unknown
 * ahead of time. Values from every supported field type (Text / Date /
 * Date-time / Email) serialise to a string, so we accept a bounded
 * string→string map. Nesting them under `customFields` keeps the base task
 * shape strict and prevents a client from injecting `id`/`organizationId`.
 */
const customFieldsSchema = z.record(z.string().max(1000)).optional();

const taskFields = {
  title: z.string().trim().min(1).max(100),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  tags: z.array(z.string().max(50)).max(50).optional(),
  customFields: customFieldsSchema,
};

export const createTaskSchema = z.object(taskFields).extend({
  status: taskStatusSchema.default('todo'),
});

/** Update is a partial patch; at least one field must be provided. */
export const updateTaskSchema = z
  .object(taskFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  });

export const bulkDeleteSchema = z
  .object({ ids: z.array(z.string().min(1)).min(1).max(100) })
  .strict();

/** Query params for the paginated + filtered + searchable list endpoint. */
export const listTasksQuerySchema = z.object({
  organizationId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export const organizationQuerySchema = z.object({
  organizationId: z.string().min(1),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
