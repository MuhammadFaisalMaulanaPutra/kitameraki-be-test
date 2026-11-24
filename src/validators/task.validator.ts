import { z } from 'zod';
import { SORT_ORDERS, TASK_SORTABLE_FIELDS } from '../models/task.model';
import { identifierSchema, jsonValueSchema, uuidSchema } from './common.validator';

export const MAX_BULK_DELETE_IDS = 100;

/**
 * Shape-level validation only (types and hard size limits). Which properties are allowed or required,
 * and what values they accept, is decided by the organization's form settings (see task-values.validator).
 * `null` or an empty string clears a value. Custom values are bounded JSON values (groups with a path and
 * dynamic lists hold objects / lists of objects, file pickers hold file references).
 */
const taskPayloadShape = {
  title: z.string().max(100, 'Title must be at most 100 characters').nullish(),
  description: z.string().max(1000, 'Description must be at most 1000 characters').nullish(),
  dueDate: z.string().max(40).nullish(),
  priority: z.string().max(50).nullish(),
  status: z.string().max(50).nullish(),
  tags: z.array(z.string().max(50, 'Tag must be at most 50 characters')).max(20, 'At most 20 tags').nullish(),
  customFields: z.record(identifierSchema, jsonValueSchema.nullable()).optional(),
};

/** Payload for POST /tasks and PUT /tasks/:id. */
export const createTaskSchema = z.strictObject(taskPayloadShape);

/** Payload for PATCH /tasks/:id. Only the provided properties are changed. */
export const updateTaskSchema = z
  .strictObject(taskPayloadShape)
  .refine((payload) => Object.keys(payload).length > 0, { error: 'At least one field must be provided' });

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().max(50).optional(),
  priority: z.string().trim().max(50).optional(),
  tag: z.string().trim().max(50).optional(),
  sortBy: z.enum(TASK_SORTABLE_FIELDS).default('createdAt'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
});

export const bulkDeleteTasksSchema = z.strictObject({
  ids: z
    .array(uuidSchema)
    .min(1, 'At least one id is required')
    .max(MAX_BULK_DELETE_IDS, `At most ${MAX_BULK_DELETE_IDS} ids can be deleted at once`)
    .transform((ids) => [...new Set(ids)]),
});

export type CreateTaskInput = z.output<typeof createTaskSchema>;
export type UpdateTaskInput = z.output<typeof updateTaskSchema>;
export type ListTasksQuery = z.output<typeof listTasksQuerySchema>;
export type BulkDeleteTasksInput = z.output<typeof bulkDeleteTasksSchema>;
