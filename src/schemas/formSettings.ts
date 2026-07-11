import { z } from 'zod';

export const formFieldTypeSchema = z.enum(['text', 'date', 'datetime', 'email', 'select', 'tags']);

export const formFieldSchema = z.object({
  id: z.string().min(1).max(100),
  // Keys become task document property paths, so keep them identifier-safe.
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Key must start with a letter and contain only letters, digits, underscores'),
  label: z.string().trim().min(1).max(100),
  type: formFieldTypeSchema,
  column: z.union([z.literal(1), z.literal(2)]),
  order: z.number().int().min(0),
  required: z.boolean().optional(),
  isBase: z.boolean().optional(),
});

export const upsertFormSettingsSchema = z
  .object({ fields: z.array(formFieldSchema).min(1).max(100) })
  .superRefine((data, ctx) => {
    const keys = data.fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Field keys must be unique' });
    }
    for (const required of ['title', 'status']) {
      if (!keys.includes(required)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `The "${required}" field cannot be removed` });
      }
    }
  });

export type UpsertFormSettingsInput = z.infer<typeof upsertFormSettingsSchema>;
