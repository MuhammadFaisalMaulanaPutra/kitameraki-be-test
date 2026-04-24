import { z } from "zod";

export const FieldSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["string", "datetime", "date", "email"]),
    order: z.number().optional(),
    isFullWidth: z.boolean().optional()
});

export const FormSettingSchema = z.object({
    fields: z.array(FieldSchema).min(1)
})