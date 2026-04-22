import { deleteTask, findTaskByNormalizedTitle, getAllTasks, getTaskById, insertTask, updateTask } from "../repositories/taskRepository";
import { toTaskListResponse, toTaskResponse } from "../Mapper/task.mapper";
import { NotFoundError } from "../errors/notFoundError";
import { BulkDeleteItemDto, TaskRequestDto, UpdateTaskDto } from "../dto/task.dto";
import pLimit from "p-limit";
import { retry } from "../utils/retries";


export const fetchTask = async (taskId: string, organizationId: string) => {
  const task = await getTaskById(taskId, organizationId);

  if (!task) {
    throw new NotFoundError("Task not found");
  }

  return toTaskResponse(task);
};

export const fetchAllTasks = async (query: any) => {
  const limit = parseInt(query.limit || "5");

  let continuationToken = query.continuationToken;
  if (continuationToken) {
    continuationToken = Buffer.from(continuationToken, "base64").toString();
  }


  const result = await getAllTasks({
    organizationId: query.organizationId,
    search: query.search,
    status: query.status,
    limit,
    continuationToken
  });
  return {
    data: toTaskListResponse(result.items),
     continuationToken: result.continuationToken
      ? Buffer.from(result.continuationToken).toString("base64")
      : null,
    hasMore: !!result.continuationToken
  };
};

export const createTask = async (body: TaskRequestDto) => {

  if (!body.title) {
    throw new Error("title is required");
  }

  if (!body.organizationId) {
    throw new Error("organizationId is required");
  }
  const normalizedTitle = body.title.trim().toLowerCase();

  const newTask = {
    id: crypto.randomUUID(),
    title: body.title,              
    normalizedTitle,                
    status: body.status || "todo",
    organizationId: body.organizationId,
  };



  const existing = await findTaskByNormalizedTitle(
  normalizedTitle,
  body.organizationId
);

if (existing) {
  throw new Error("Task already exists in this organization");
}

  const saved = await insertTask(newTask);

  return toTaskResponse(saved);
};

export const patchTask = async (
  taskId: string,
  organizationId: string,
  body: UpdateTaskDto
) => {
  if (!taskId || !organizationId) {
    throw new Error("taskId and organizationId required");
  }

  // ✅ hanya allow field tertentu
  const allowedFields = ["title", "status"];

  const patchOperations = Object.keys(body)
    .filter((key) => allowedFields.includes(key))
    .map((key) => ({
      op: "replace",
      path: `/${key}`,
      value: (body as any)[key],
    }));

  if (patchOperations.length === 0) {
    throw new Error("No valid fields to update");
  }

  let updated;
  try {
    updated = await updateTask(taskId, organizationId, patchOperations);
  } catch (err: any) {
    if (err.code === 404) {
      throw new NotFoundError("Task not found");
    }
    throw err;
  }

  return toTaskResponse(updated);
};

export const deleteTasks = async (taskId: string, organizationId: string) => {
    if(!taskId || !organizationId) {
        throw new Error("Task ID and Organization ID are required");
    }

    const deletedTask = await deleteTask(taskId, organizationId);
    if(!deletedTask) {
        throw new Error("Task not found");
    }

    return deletedTask;
}

export const bulkDeleteTasks = async (items: BulkDeleteItemDto[]) => {
    const limit = pLimit(5); 
    
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items must be a non-empty array");
  }

  items.forEach((item, index) => {
    if (!item.id || !item.organizationId) {
      throw new Error(`Invalid item at index ${index}`);
    }
  });


  const results = await Promise.allSettled(
    items.map(item =>
      limit(() =>
        retry(() => deleteTask(item.id, item.organizationId))
      )
    )
  );

  // ✅ aggregate result
  let success = 0;
  let failed = 0;
  const errors: any[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      success++;
    } else {
      failed++;
      errors.push({
        item: items[index],
        error: result.reason?.message || "Unknown error",
      });
    }
  });

  return {
    total: items.length,
    success,
    failed,
    errors,
  };
};