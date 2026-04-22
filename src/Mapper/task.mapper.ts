import { TaskResponseDto } from "../dto/task.dto";

export const toTaskResponse = (task: any): TaskResponseDto => {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    organizationId: task.organizationId,
  };
};

export const toTaskListResponse = (tasks: any[]): TaskResponseDto[] => {
  return tasks.map(toTaskResponse);
};

