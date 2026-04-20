import { z } from "zod";
import {
    CreateTaskSchema,
    UpdateTaskSchema,
    DeleteTaskSchema,
    BulkDeleteTasksSchema,
    GetTasksSchema,
    GetTaskSchema
} from "../../validators/TaskValidator";

export type CreateTaskDTO = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDTO = z.infer<typeof UpdateTaskSchema>;
export type DeleteTaskDTO = z.infer<typeof DeleteTaskSchema>;
export type BulkDeleteTasksDTO = z.infer<typeof BulkDeleteTasksSchema>;
export type GetTasksDTO = z.infer<typeof GetTasksSchema>;
export type GetTaskDTO = z.infer<typeof GetTaskSchema>;
