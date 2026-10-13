import { z } from "zod";

export const FormFieldTypeSchema = z.enum([
  "text",
  "textfield",
  "date",
  "datetime",
  "email",
]);

export const FormComponentLayoutSchema = z.object({
  row: z.number().int().nonnegative("Row must be a non-negative integer").default(0),
  column: z.number().int().min(1).max(2, "Form supports up to 2 columns of fields").default(1),
});

export const FormComponentValidateSchema = z.object({
  required: z.boolean().default(false),
  pattern: z.string().optional(),
});

export const FormComponentSchema = z.object({
  id: z.string().min(1, "Component ID is required"),
  key: z.string().min(1, "Data key is required"),
  label: z.string().min(1, "Field label is required").max(100, "Field label cannot exceed 100 characters"),
  type: FormFieldTypeSchema,
  layout: FormComponentLayoutSchema.default({ row: 0, column: 1 }),
  validate: FormComponentValidateSchema.default({ required: false }),
  description: z.string().max(200).optional(),
});

export const FormSettingSchema = z.object({
  id: z.string().default("default"),
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  schemaVersion: z.number().int().default(1),
  exporter: z
    .object({
      name: z.string().default("kitameraki-form-builder"),
      version: z.string().default("1.0.0"),
    })
    .default({ name: "kitameraki-form-builder", version: "1.0.0" }),
  type: z.literal("default").default("default"),
  components: z.array(FormComponentSchema).default([]),
  updatedAt: z.string().datetime().optional(),
});

export const UpsertFormSettingSchema = z
  .object({
    organizationId: z.string().uuid("Organization ID must be a valid UUID").optional(),
    schemaVersion: z.number().int().optional(),
    components: z.array(FormComponentSchema).max(100, "Form cannot exceed 100 components").optional(),
    fields: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          type: FormFieldTypeSchema,
          row: z.number().int().nonnegative().optional(),
          column: z.number().int().min(1).max(2).optional(),
          required: z.boolean().optional(),
          placeholder: z.string().optional(),
        })
      )
      .optional(),
  })
  .transform((data) => {
    let components = data.components || [];

    if (components.length === 0 && data.fields && data.fields.length > 0) {
      components = data.fields.map((f) => ({
        id: f.id,
        key: f.id.replace(/^Field_/, "").replace(/^fld-/, ""),
        label: f.name,
        type: f.type,
        layout: {
          row: f.row ?? 0,
          column: (f.column ?? 1) as 1 | 2,
        },
        validate: {
          required: f.required ?? false,
        },
        description: f.placeholder,
      }));
    }

    return {
      organizationId: data.organizationId,
      schemaVersion: data.schemaVersion ?? 1,
      components,
    };
  });

export const GetFormSettingQuerySchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
});

export const FormFieldSchema = FormComponentSchema;

export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;
export type FormComponentLayout = z.infer<typeof FormComponentLayoutSchema>;
export type FormComponentValidate = z.infer<typeof FormComponentValidateSchema>;
export type FormComponent = z.infer<typeof FormComponentSchema>;
export type FormField = FormComponent;
export type FormSetting = z.infer<typeof FormSettingSchema>;
export type UpsertFormSettingInput = z.infer<typeof UpsertFormSettingSchema>;
export type GetFormSettingQuery = z.infer<typeof GetFormSettingQuerySchema>;
