import { z } from 'zod';
import { AppError } from '../libs/response';
import { FormField } from '../interfaces/formSettings';

const FormFieldSchema = z.object({
  id: z.string().min(1, 'field id is required'),
  label: z.string().min(1, 'field label is required'),
  type: z.enum(['text', 'date', 'datetime', 'email']),
  required: z.boolean().default(false),
  column: z.union([z.literal(0), z.literal(1)]),
  order: z.number().int().min(0),
});

const FormSettingsBodySchema = z.object({
  fields: z.array(FormFieldSchema),
});

export function validateFormSettingsBody(body: unknown): { fields: FormField[] } {
  const result = FormSettingsBodySchema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.');
    const msg = path ? `${path}: ${issue.message}` : issue?.message ?? 'Validation error';
    throw new AppError(msg, 400);
  }
  return result.data as { fields: FormField[] };
}
