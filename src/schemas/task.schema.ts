import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string().uuid("Task id must be a valid UUID"),
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  title: z.string().min(1, "Title is required").max(100, "Title must not exceed 100 characters"),
  description: z.string().max(1000, "Description must not exceed 1000 characters").optional(),
  dueDate: z.string().datetime("Due date must be in ISO 8601 date-time format").optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "in-progress", "completed"]),
  tags: z.array(z.string().max(50, "Tag must not exceed 50 characters")).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export const CreateTaskSchema = TaskSchema.omit({ id: true }).extend({
  id: z.string().uuid().optional(),
});

export const UpdateTaskSchema = TaskSchema.partial().omit({ id: true, organizationId: true });

export const BulkDeleteTasksSchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  taskIds: z
    .union([
      z
        .string()
        .min(1, "Query parameter 'taskIds' cannot be empty")
        .transform((val) => val.split(",").map((id) => id.trim()).filter(Boolean)),
      z.array(z.string()),
    ], {
      errorMap: () => ({ message: "Query parameter 'taskIds' is required" }),
    })
    .pipe(
      z
        .array(z.string().uuid("Each task ID must be a valid UUID"))
        .min(1, "At least one task ID is required")
        .max(50, "Bulk delete cannot exceed 50 task IDs per request")
    ),
});

export const GetTasksQuerySchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "in-progress", "completed"]).optional(),
  tags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map((t) => t.trim()).filter(Boolean) : undefined))
    .pipe(
      z
        .array(z.string().max(50, "Tag must not exceed 50 characters"))
        .max(10, "Cannot filter by more than 10 tags")
        .optional()
    ),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be formatted strictly as YYYY-MM-DD")
    .refine((val) => !isNaN(Date.parse(val)), "Start date must be a valid date")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be formatted strictly as YYYY-MM-DD")
    .refine((val) => !isNaN(Date.parse(val)), "End date must be a valid date")
    .optional(),
  search: z.string().trim().max(100, "Search query must not exceed 100 characters").optional(),
  page: z
    .coerce
    .number()
    .int("Page must be an integer")
    .positive("Page must be greater than 0")
    .default(1),
  limit: z
    .coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: "startDate cannot be after endDate",
    path: ["startDate"],
  }
);

export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type BulkDeleteTasksInput = z.infer<typeof BulkDeleteTasksSchema>;
export type GetTasksQuery = z.infer<typeof GetTasksQuerySchema>;
