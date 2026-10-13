import {
  SqlQuerySpec,
  PatchOperation,
  BulkOperationType,
  OperationInput,
  FeedOptions,
} from "@azure/cosmos";
import { tasksContainer } from "@/database/cosmosClient";
import { Task, UpdateTaskInput } from "@/schemas/task.schema";
import { isCosmosNotFoundError } from "@/utils/errors";


export interface TaskFilterOptions {
  organizationId: string;
  priority?: "low" | "medium" | "high";
  status?: "todo" | "in-progress" | "completed";
  tags?: string[];
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TaskQueryResult {
  tasks: Task[];
  total: number;
}

export async function findAndCount(filters: TaskFilterOptions): Promise<TaskQueryResult> {
  const {
    organizationId,
    priority,
    status,
    tags,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 10,
  } = filters;

  const conditions: string[] = ["c.organizationId = @organizationId"];
  const parameters: SqlQuerySpec["parameters"] = [
    { name: "@organizationId", value: organizationId },
  ];

  if (priority) {
    conditions.push("c.priority = @priority");
    parameters.push({ name: "@priority", value: priority });
  }

  if (status) {
    conditions.push("c.status = @status");
    parameters.push({ name: "@status", value: status });
  }

  if (tags && tags.length > 0) {
    const tagConditions = tags.map((tag, index) => {
      const paramName = `@tag_${index}`;
      parameters.push({ name: paramName, value: tag });
      return `ARRAY_CONTAINS(c.tags, ${paramName})`;
    });
    conditions.push(`(${tagConditions.join(" OR ")})`);
  }

  if (startDate) {
    const startBound = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`;
    conditions.push("c.dueDate >= @startDate");
    parameters.push({ name: "@startDate", value: startBound });
  }

  if (endDate) {
    const endBound = endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;
    conditions.push("c.dueDate <= @endDate");
    parameters.push({ name: "@endDate", value: endBound });
  }

  if (search) {
    conditions.push("CONTAINS(c.title, @search, true)");
    parameters.push({ name: "@search", value: search });
  }

  const whereClause = conditions.join(" AND ");

  const countQuerySpec: SqlQuerySpec = {
    query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
    parameters: [...parameters],
  };

  const offset = Math.max(0, (page - 1) * limit);
  const dataParameters = [
    ...parameters,
    { name: "@offset", value: offset },
    { name: "@limit", value: limit },
  ];

  const dataQuerySpec: SqlQuerySpec = {
    query: `SELECT c.id, c.organizationId, c.title, c.description, c.dueDate, c.priority, c.status, c.tags, c.customFields FROM c WHERE ${whereClause} ORDER BY c._ts DESC OFFSET @offset LIMIT @limit`,
    parameters: dataParameters,
  };

  const feedOptions: FeedOptions = { partitionKey: organizationId };

  const [countResponse, dataResponse] = await Promise.all([
    tasksContainer.items.query<number>(countQuerySpec, feedOptions).fetchAll(),
    tasksContainer.items.query<Task>(dataQuerySpec, feedOptions).fetchAll(),
  ]);

  const total = countResponse.resources?.[0] ?? 0;
  const tasks = dataResponse.resources ?? [];

  return {
    tasks,
    total,
  };
}

export async function findByOrganizationId(organizationId: string): Promise<Task[]> {
  const result = await findAndCount({ organizationId, page: 1, limit: 100 });
  return result.tasks;
}

export async function findById(id: string, organizationId: string): Promise<Task | null> {
  try {
    const { resource } = await tasksContainer.item(id, organizationId).read<Task>();
    return resource ?? null;
  } catch (error: unknown) {
    if (isCosmosNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function create(task: Task): Promise<Task> {
  const { resource } = await tasksContainer.items.create<Task>(task);
  if (!resource) {
    throw new Error("Failed to create task in Cosmos DB");
  }
  return resource;
}

const FORBIDDEN_PATCH_KEYS = new Set(["__proto__", "constructor", "prototype", "id", "organizationId"]);

export async function update(
  id: string,
  organizationId: string,
  updates: UpdateTaskInput
): Promise<Task | null> {
  const patchOperations: PatchOperation[] = Object.entries(updates)
    .filter(([key]) => !FORBIDDEN_PATCH_KEYS.has(key))
    .map(([key, value]) => ({
      op: "replace",
      path: `/${key}`,
      value,
    }));

  if (patchOperations.length === 0) {
    return findById(id, organizationId);
  }

  try {
    const { resource } = await tasksContainer.item(id, organizationId).patch<Task>(patchOperations);
    return resource ?? null;
  } catch (error: unknown) {
    if (isCosmosNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function deleteById(id: string, organizationId: string): Promise<boolean> {
  try {
    await tasksContainer.item(id, organizationId).delete();
    return true;
  } catch (error: unknown) {
    if (isCosmosNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

export async function deleteMany(
  ids: string[],
  organizationId: string
): Promise<{ deletedIds: string[]; failedIds: string[] }> {
  if (!ids || ids.length === 0) {
    return { deletedIds: [], failedIds: [] };
  }

  const operations: OperationInput[] = ids.map((id) => ({
    operationType: BulkOperationType.Delete,
    id,
    partitionKey: organizationId,
  }));

  const responses = await tasksContainer.items.bulk(operations);
  const deletedIds: string[] = [];
  const failedIds: string[] = [];

  responses.forEach((res, index) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      deletedIds.push(ids[index]);
    } else {
      failedIds.push(ids[index]);
    }
  });

  return { deletedIds, failedIds };
}

export async function findDistinctOrganizationIds(): Promise<string[]> {
  const querySpec: SqlQuerySpec = {
    query: "SELECT DISTINCT VALUE c.organizationId FROM c",
  };

  const feedOptions: FeedOptions = {
    maxDegreeOfParallelism: -1,
  };

  const { resources } = await tasksContainer.items
    .query<string>(querySpec, feedOptions)
    .fetchAll();

  return (resources ?? []).filter(Boolean);
}
