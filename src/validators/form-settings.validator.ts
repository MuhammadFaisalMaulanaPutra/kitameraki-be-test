import { z } from 'zod';
import { formFieldTypes } from '../models/form-settings.model';

const fieldSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(64),
  key: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(64),
  label: z.string().trim().min(1).max(100),
  type: z.enum(formFieldTypes),
  visible: z.boolean(),
  required: z.boolean(),
  column: z.union([z.literal(1), z.literal(2)]),
  order: z.number().int().nonnegative(),
  system: z.boolean()
}).strict();

export const formSettingsSchema = z.object({
  fields: z.array(fieldSchema).min(1).max(100)
}).strict().superRefine((settings, context) => {
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const field of settings.fields) {
    if (ids.has(field.id)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Field IDs must be unique' });
    if (keys.has(field.key)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Field keys must be unique' });
    ids.add(field.id);
    keys.add(field.key);
  }

  for (const systemKey of ['title', 'description', 'status', 'priority', 'dueDate']) {
    const field = settings.fields.find((item) => item.key === systemKey);
    if (!field || !field.system) context.addIssue({ code: z.ZodIssueCode.custom, message: `System field ${systemKey} is required` });
  }
});
