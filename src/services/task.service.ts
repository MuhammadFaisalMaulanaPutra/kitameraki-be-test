import { v4 as uuidv4 } from "uuid";
import * as taskRepository from "@/repositories/task.repository";
import { Task, CreateTaskInput, UpdateTaskInput, GetTasksQuery } from "@/schemas/task.schema";
import { NotFoundError, BadRequestError } from "@/utils/errors";

export interface PaginatedTasks {
  tasks: Task[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

export async function getTasks(query: GetTasksQuery): Promise<PaginatedTasks> {
  const { organizationId, page, limit } = query;
  if (!organizationId) {
    throw new BadRequestError("organizationId is required");
  }

  const { tasks, total } = await taskRepository.findAndCount({
    ...query,
    organizationId,
  });
  const totalPage = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    tasks,
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
  };
}

export async function getTask(id: string, organizationId: string): Promise<Task> {
  if (!id || !organizationId) {
    throw new BadRequestError("Both id and organizationId are required");
  }
  const task = await taskRepository.findById(id, organizationId);
  if (!task) {
    throw new NotFoundError(`Task with id '${id}' not found in organization '${organizationId}'`);
  }
  return task;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const entity: Task = {
    ...input,
    id: input.id ?? uuidv4(),
  };

  return taskRepository.create(entity);
}

export async function updateTask(
  id: string,
  organizationId: string,
  input: UpdateTaskInput
): Promise<Task> {
  if (!id || !organizationId) {
    throw new BadRequestError("Both id and organizationId are required");
  }

  const updated = await taskRepository.update(id, organizationId, input);
  if (!updated) {
    throw new NotFoundError(`Task with id '${id}' not found in organization '${organizationId}'`);
  }

  return updated;
}

export async function deleteTask(id: string, organizationId: string): Promise<void> {
  if (!id || !organizationId) {
    throw new BadRequestError("Both id and organizationId are required");
  }

  const deleted = await taskRepository.deleteById(id, organizationId);
  if (!deleted) {
    throw new NotFoundError(`Task with id '${id}' not found in organization '${organizationId}'`);
  }
}

export async function bulkDeleteTasks(
  taskIds: string[],
  organizationId: string
): Promise<{ deletedIds: string[]; failedIds: string[] }> {
  if (!taskIds || taskIds.length === 0) {
    throw new BadRequestError("taskIds array must not be empty");
  }
  if (!organizationId) {
    throw new BadRequestError("organizationId is required");
  }

  return taskRepository.deleteMany(taskIds, organizationId);
}
