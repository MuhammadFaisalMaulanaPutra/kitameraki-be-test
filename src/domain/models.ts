import { z } from 'zod';

export const taskStatusSchema = z.enum(['todo', 'in-progress', 'completed']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high']);
export const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'date',
  'datetime',
  'email',
  'select',
  'tags',
]);

export const fieldDefinitionSchema = z
  .object({
    id: z.string().min(1).max(80),
    label: z.string().trim().min(1).max(80),
    kind: z.enum(['system', 'custom']),
    type: fieldTypeSchema,
    required: z.boolean(),
  })
  .strict();

export const formRowSchema = z
  .object({
    id: z.string().min(1).max(80),
    fieldIds: z.array(z.string()).min(1).max(2),
  })
  .strict();

export const customFieldsSchema = z.record(
  z.string().regex(/^custom-[0-9a-f-]{36}$/i),
  z.string().max(2000).nullable(),
);

const taskTagsSchema = z.array(z.string().trim().min(1).max(50)).max(20);

export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).optional(),
    dueDate: z.iso.datetime().optional(),
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema,
    tags: taskTagsSchema.default([]),
    customFields: customFieldsSchema.default({}),
  })
  .strict();

export const taskPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    dueDate: z.iso.datetime().optional(),
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema.optional(),
    tags: taskTagsSchema.optional(),
    customFields: customFieldsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');

export const containsFilterSchema = z
  .object({
    fieldId: z.string().min(1).max(80),
    operator: z.enum(['contains', 'equals']),
    value: z.string().trim().min(1).max(200),
  })
  .strict();

export const betweenFilterSchema = z
  .object({
    fieldId: z.string().min(1).max(80),
    operator: z.literal('between'),
    from: z.string().max(40).optional(),
    to: z.string().max(40).optional(),
  })
  .strict()
  .refine((value) => value.from || value.to, 'Provide from or to.');

export const filtersSchema = z
  .array(z.union([containsFilterSchema, betweenFilterSchema]))
  .max(20, 'No more than 20 filters are allowed.')
  .superRefine((filters, context) => {
    const ids = filters.map((filter) => filter.fieldId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'A field can only be filtered once.',
      });
    }
  });

export const formSettingsInputSchema = z
  .object({
    fields: z.array(fieldDefinitionSchema),
    rows: z.array(formRowSchema).min(1),
  })
  .strict();

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type FieldType = z.infer<typeof fieldTypeSchema>;
export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;
export type FormRow = z.infer<typeof formRowSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskPatch = z.infer<typeof taskPatchSchema>;
export type FieldFilter = z.infer<typeof filtersSchema>[number];
export type FormSettingsInput = z.infer<typeof formSettingsInputSchema>;

export type SystemFieldType = 'text' | 'textarea' | 'datetime' | 'select' | 'tags';
export type CustomFieldType = 'text' | 'date' | 'datetime' | 'email';

export interface FormSettings extends FormSettingsInput {
  etag?: string;
  updatedAt?: string;
}

export interface FormSettingsDocument extends FormSettingsInput {
  id: 'form-settings';
  organizationId: string;
  updatedAt: string;
  _etag?: string;
}

export interface Task extends TaskInput {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDocument extends Task {
  _etag?: string;
  _rid?: string;
  _attachments?: string;
  _ts?: number;
}

export interface ListTasksQuery {
  page: number;
  pageSize: number;
  q?: string;
  filters: FieldFilter[];
}

export interface TaskSummary {
  total: number;
  inProgress: number;
  dueThisWeek: number;
}

export interface PaginatedTasks {
  items: Task[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: TaskSummary;
}
