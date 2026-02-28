import z from "zod";

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high']);
export const TaskStatusSchema = z.enum(['todo', 'in-progress', 'completed']);

export const TaskSchema = z.object({
  id: z.string().optional(),
  organizationId: z.string().min(1, "Organization ID is required"),
  title: z.string().min(1, "Title cannot be empty").max(100),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(), 
  priority: TaskPrioritySchema.default("medium"),
  status: TaskStatusSchema.default("todo"),
  tags: z.array(z.string().max(50)).optional().default([]),
  customFields: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
