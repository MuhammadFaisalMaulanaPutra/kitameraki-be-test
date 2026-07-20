import { z } from "zod";

// ============================================================
// Enums
// ============================================================

export const TaskPriority = z.enum(["low", "medium", "high"]);
export const TaskStatus = z.enum(["todo", "in-progress", "completed"]);

// ============================================================
// Schema utama Task (representasi dokumen di Cosmos DB)
// ============================================================

export const TaskSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(100, "Title max 100 characters"),
  description: z
    .string()
    .max(1000, "Description max 1000 characters")
    .optional(),
  dueDate: z
    .string()
    .datetime({ message: "dueDate must be a valid ISO 8601 date-time" })
    .optional(),
  priority: TaskPriority.optional(),
  status: TaskStatus,
  tags: z
    .array(z.string().max(50, "Each tag max 50 characters"))
    .optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// ============================================================
// Schema untuk Create (POST /InsertTask)
// - id auto-generated, jadi tidak perlu dari client
// - organizationId, title, status wajib
// ============================================================

export const CreateTaskSchema = z
  .object({
    organizationId: z.string().uuid("organizationId must be a valid UUID"),
    title: z
      .string({ required_error: "Title is required" })
      .min(1, "Title is required")
      .max(100, "Title max 100 characters"),
    description: z
      .string()
      .max(1000, "Description max 1000 characters")
      .optional(),
    dueDate: z
      .string()
      .datetime({ message: "dueDate must be a valid ISO 8601 date-time" })
      .optional(),
    priority: TaskPriority.optional(),
    status: TaskStatus,
    tags: z
      .array(z.string().max(50, "Each tag max 50 characters"))
      .optional(),
  })
  .strict(); // tolak field yang tidak dikenali

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// ============================================================
// Schema untuk Update (PATCH /UpdateTask)
// - Semua field optional (partial update)
// - Tidak boleh update id atau organizationId
// ============================================================

export const UpdateTaskSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(100, "Title max 100 characters")
      .optional(),
    description: z
      .string()
      .max(1000, "Description max 1000 characters")
      .optional(),
    dueDate: z
      .string()
      .datetime({ message: "dueDate must be a valid ISO 8601 date-time" })
      .optional(),
    priority: TaskPriority.optional(),
    status: TaskStatus.optional(),
    tags: z
      .array(z.string().max(50, "Each tag max 50 characters"))
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// ============================================================
// Schema untuk query params
// ============================================================

/** Validasi query params yang butuh id + organizationId */
export const TaskIdParamsSchema = z.object({
  id: z.string({ required_error: "id is required" }).uuid("id must be a valid UUID"),
  organizationId: z
    .string({ required_error: "organizationId is required" })
    .uuid("organizationId must be a valid UUID"),
});

export type TaskIdParams = z.infer<typeof TaskIdParamsSchema>;

/** Validasi query param organizationId saja */
export const OrganizationIdParamSchema = z.object({
  organizationId: z
    .string({ required_error: "organizationId is required" })
    .uuid("organizationId must be a valid UUID"),
});

export type OrganizationIdParam = z.infer<typeof OrganizationIdParamSchema>;

// ============================================================
// Schema untuk BulkDelete body
// ============================================================

export const BulkDeleteSchema = z
  .array(z.string().uuid("Each id must be a valid UUID"))
  .min(1, "At least one task id is required")
  .max(100, "Maximum 100 tasks can be deleted at once");

export type BulkDeleteInput = z.infer<typeof BulkDeleteSchema>;
