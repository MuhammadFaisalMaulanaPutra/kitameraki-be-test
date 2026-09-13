import { z } from "zod";

export const fieldTypeSchema = z.enum(["text", "date", "datetime", "email"]);

export const customFieldSchema = z.object({
    id: z.string(),
    label: z.string().min(1).max(100),
    type: fieldTypeSchema,
    column: z.number().int().min(0).max(1),
    order: z.number().int().min(0),
});

export const formSettingsSchema = z.object({
    id: z.string(),
    organizationId: z.string().uuid(),
    fields: z.array(customFieldSchema),
});

export type CustomField = z.infer<typeof customFieldSchema>;
export type FormSettings = z.infer<typeof formSettingsSchema>;