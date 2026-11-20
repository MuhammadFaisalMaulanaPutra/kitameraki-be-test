import { z } from 'zod';
import { BadRequestError } from '../utils/errors.util.js';

export const TaskStatusEnum = z.enum(['todo', 'in-progress', 'completed']);
export const TaskPriorityEnum = z.enum(['low', 'medium', 'high']);

export const CreateTaskSchema = z.object({
    organizationId: z.string().uuid({ message: 'organizationId harus berupa format UUID yang valid' }),
    title: z.string().trim().min(1, { message: 'title tidak boleh kosong' }).max(100, { message: 'title maksimal 100 karakter' }),
    description: z.string().trim().max(1000, { message: 'description maksimal 1000 karakter' }).optional(),
    dueDate: z.string().datetime({ message: 'dueDate harus berupa format ISO datetime yang valid' }).optional(),
    priority: TaskPriorityEnum.optional().default('medium'),
    status: TaskStatusEnum.optional().default('todo'),
    tags: z.array(z.string().max(50)).optional().default([]),
    customFields: z.record(z.string(), z.any()).optional().default({}),
});

export const UpdateTaskSchema = z.object({
    title: z.string().trim().min(1, { message: 'title tidak boleh kosong' }).max(100, { message: 'title maksimal 100 karakter' }).optional(),
    description: z.string().trim().max(1000, { message: 'description maksimal 1000 karakter' }).optional(),
    dueDate: z.string().datetime({ message: 'dueDate harus berupa format ISO datetime yang valid' }).optional(),
    priority: TaskPriorityEnum.optional(),
    status: TaskStatusEnum.optional(),
    tags: z.array(z.string().max(50)).optional(),
    customFields: z.record(z.string(), z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Payload update tidak boleh kosong' });

export const TaskFilterSchema = z.object({
    organizationId: z.string().uuid({ message: 'Query organizationId wajib berupa UUID yang valid' }),
    search: z.string().optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    sortBy: z.enum(['title', 'dueDate', 'priority', 'status', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const BulkDeleteTaskSchema = z.array(
    z.string().uuid({ message: 'Setiap ID task harus berupa format UUID yang valid' })
).min(1, { message: 'Array task ids tidak boleh kosong!' });

export function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const firstIssue = result.error.issues[0];
        const errorMessage = `${firstIssue.path.join('.')}: ${firstIssue.message}`;
        throw new BadRequestError(errorMessage);
    }
    return result.data;
}