import z from "zod";

export const FieldTypeSchema = z.enum(['Text', 'Date', 'DateTime', 'Email']);

export const FormFieldSchema = z.object({
  id: z.string().min(1),
  type: FieldTypeSchema,
  label: z.string().min(1),
  width: z.enum(['full', 'half']),
  groupId: z.string().optional(),
  position: z.enum(['left', 'right']).optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

export const FormSettingsSchema = z.object({
  id: z.string().min(1, "Settings ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
  fields: z.array(FormFieldSchema).default([])
});
