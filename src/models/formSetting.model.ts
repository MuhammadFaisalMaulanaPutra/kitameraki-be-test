import { z } from "zod";

// ============================================================
// Enums
// ============================================================

/**
 * Tipe field yang tersedia untuk kustomisasi form.
 * Sesuai dengan spesifikasi: Text, Date, Date and Time, Email.
 */
export const FieldType = z.enum(["text", "date", "datetime", "email"]);
export type FieldType = z.infer<typeof FieldType>;

// ============================================================
// Sub-schemas
// ============================================================

/**
 * Schema untuk satu field kustom.
 * Setiap field memiliki id unik, label, tipe, dan metadata posisi.
 */
export const FormFieldSchema = z.object({
  id: z.string().uuid("Field id must be a valid UUID"),
  label: z
    .string()
    .min(1, "Field label is required")
    .max(100, "Field label max 100 characters"),
  type: FieldType,
  required: z.boolean().optional().default(false),
  /** Indeks baris (0-based). Baris bisa unlimited. */
  row: z.number().int().min(0, "Row index must be >= 0"),
  /** Indeks kolom (0 atau 1). Maksimal 2 kolom per baris. */
  column: z
    .number()
    .int()
    .min(0, "Column index must be >= 0")
    .max(1, "Maximum 2 columns per row (0 or 1)"),
});

export type FormField = z.infer<typeof FormFieldSchema>;

// ============================================================
// Schema utama FormSetting (dokumen di Cosmos DB)
// ============================================================

/**
 * Dokumen FormSetting yang disimpan di Cosmos DB.
 * Satu dokumen per organizationId (singleton pattern).
 *
 * `id` diset sama dengan organizationId agar lookup mudah.
 */
export const FormSettingSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  fields: z.array(FormFieldSchema),
  updatedAt: z.string().datetime().optional(),
});

export type FormSetting = z.infer<typeof FormSettingSchema>;

// ============================================================
// Schema untuk Update (PUT /UpdateFormSettings)
// ============================================================

/**
 * Schema body untuk update form settings.
 * Client mengirimkan seluruh array fields (replace strategy).
 */
export const UpdateFormSettingSchema = z
  .object({
    fields: z
      .array(FormFieldSchema)
      .max(200, "Maximum 200 fields allowed"),
  })
  .strict()
  .refine(
    (data) => {
      // Validasi: tidak ada duplikat posisi (row, column) yang sama
      const positions = data.fields.map((f) => `${f.row}-${f.column}`);
      return new Set(positions).size === positions.length;
    },
    {
      message:
        "Duplicate field position detected. Each (row, column) combination must be unique.",
    }
  )
  .refine(
    (data) => {
      // Validasi: tidak ada duplikat field id
      const ids = data.fields.map((f) => f.id);
      return new Set(ids).size === ids.length;
    },
    {
      message: "Duplicate field id detected. Each field must have a unique id.",
    }
  );

export type UpdateFormSettingInput = z.infer<typeof UpdateFormSettingSchema>;

// ============================================================
// Schema untuk query params
// ============================================================

/**
 * Validasi query param organizationId untuk form settings endpoints.
 * Re-use pattern yang sama dengan task model.
 */
export const FormSettingParamsSchema = z.object({
  organizationId: z
    .string({ required_error: "organizationId is required" })
    .uuid("organizationId must be a valid UUID"),
});

export type FormSettingParams = z.infer<typeof FormSettingParamsSchema>;
