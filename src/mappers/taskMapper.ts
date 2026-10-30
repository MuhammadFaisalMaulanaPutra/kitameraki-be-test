import type { TaskDocument, TaskDto } from "../types/task";

export function toTaskDto(task: TaskDocument): TaskDto {
    return {
        id: task.id,
        organizationId: task.organizationId,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        tags: task.tags
    };
}
