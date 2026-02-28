import z from "zod";
import { 
  TaskSchema, 
  TaskPrioritySchema, 
  TaskStatusSchema 
} from "../models/task";

// Inferred Types from Zod
export type Task = z.infer<typeof TaskSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// Request Parameter Types (DTO)
export interface FindTasksParams {
  organizationId: string;
  pageSize?: number;
  pageIndex?: number;
  search?: string;
  filter?: {
    status?: TaskStatus;
    priority?: TaskPriority;
  };
}

export interface TaskIdentityParams {
  id: string;
  organizationId: string;
}

export interface UpdateTaskParams extends TaskIdentityParams {
  updates: Partial<Task>;
}
