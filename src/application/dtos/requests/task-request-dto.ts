import { z } from "zod";
import {
    CreateTaskSchema,
    UpdateTaskSchema,
    DeleteTaskSchema,
    BulkDeleteTasksSchema,
    GetTasksSchema,
    GetTaskSchema
} from "../../validators/task-validator";
import { Organization } from "../../validators/schema-validator";

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskSchema>;
export type BulkDeleteTasksInput = z.infer<typeof BulkDeleteTasksSchema>;
export type GetTasksInput = z.infer<typeof GetTasksSchema>;
export type GetTaskInput = z.infer<typeof GetTaskSchema>;

export type CreateTaskDTO = CreateTaskInput & Organization;
export type UpdateTaskDTO = UpdateTaskInput & Organization;
export type DeleteTaskDTO = DeleteTaskInput & Organization;
export type BulkDeleteTasksDTO = BulkDeleteTasksInput & Organization & {
    ids: string[];
};
export type GetTasksDTO = GetTasksInput & Organization;
export type GetTaskDTO = GetTaskInput & Organization;