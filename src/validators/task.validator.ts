import { z } from 'zod';
import { taskPriorities, taskStatuses } from '../models/task.model';

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(2000),
  status: z.enum(taskStatuses).default('todo'),
  priority: z.enum(taskPriorities).default('medium'),
  dueDate: z.string().datetime({ offset: true }).optional(),
  customFields: z.record(z.string().trim().max(2000)).optional().default({})
}).strict();

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: optionalText(2000),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  customFields: z.record(z.string().trim().max(2000)).optional()
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required'
});

export const taskIdSchema = z.string().uuid();
