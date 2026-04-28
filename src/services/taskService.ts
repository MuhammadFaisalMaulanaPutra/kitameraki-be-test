/**
 * Task Service
 * Handles all Cosmos DB operations for tasks
 * Provides a clean abstraction layer for data access
 */

import { CosmosClient } from "@azure/cosmos";
import { DB_CONFIG } from "../constants";
import { ITaskDBStruct, IPaginatedResponse } from "../interfaces/Task.interface";
import {
  buildCountQuery,
  buildGetSingleTaskQuery,
  buildSelectQuery,
} from "./queryBuilder";

/**
 * Gets the database container for tasks
 * @param client - Cosmos DB client
 * @returns Tasks container reference
 */
function getTasksContainer(client: CosmosClient) {
  return client
    .database(DB_CONFIG.DATABASE_NAME)
    .container(DB_CONFIG.CONTAINER_NAME);
}

/**
 * Retrieves paginated tasks with optional filtering and searching
 * @param client - Cosmos DB client
 * @param organizationId - Organization ID
 * @param pageNumber - Current page number
 * @param pageSize - Items per page
 * @param status - Optional status filter
 * @param searchTerm - Optional search term
 * @param sortField - Sort by field
 * @param sortDirection - Sort direction
 * @returns Paginated response with tasks
 */
export async function getTasksList(
  client: CosmosClient,
  organizationId: number,
  pageNumber: number,
  pageSize: number,
  status?: number,
  searchTerm?: string,
  sortField: string = "createdAt",
  sortDirection: "ASC" | "DESC" = "DESC"
): Promise<IPaginatedResponse<ITaskDBStruct>> {
  const container = getTasksContainer(client);
  const offset = (pageNumber - 1) * pageSize;

  // Get total count
  const countQuery = buildCountQuery(organizationId, status, searchTerm);
  const countResult = await container
    .items.query<number>(countQuery)
    .fetchAll();
  const totalCount = countResult.resources[0] || 0;

  // Get paginated data
  const dataQuery = buildSelectQuery({
    organizationId,
    status,
    searchTerm,
    sortField,
    sortDirection,
    offset,
    pageSize,
  });

  const tasksResult = await container
    .items.query<ITaskDBStruct>(dataQuery)
    .fetchAll();

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    items: tasksResult.resources,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
  };
}

/**
 * Retrieves a single task by ID
 * @param client - Cosmos DB client
 * @param taskId - Task ID
 * @param organizationId - Organization ID
 * @returns Task data or null if not found
 * @throws Error if task is deleted
 */
export async function getTaskById(
  client: CosmosClient,
  taskId: string,
  organizationId: number
): Promise<ITaskDBStruct | null> {
  const container = getTasksContainer(client);

  try {
    const { resource } = await container.item(taskId, String(organizationId)).read<ITaskDBStruct>();

    if (!resource) {
      return null;
    }

    if (resource.isDeleted) {
      throw new Error("Task has been deleted");
    }

    return resource;
  } catch (e: any) {
    if (e.code === 404) {
      return null;
    }
    throw e;
  }
}

/**
 * Creates a new task
 * @param client - Cosmos DB client
 * @param taskData - Task data to create
 * @returns Created task
 */
export async function createTask(
  client: CosmosClient,
  taskData: ITaskDBStruct
): Promise<ITaskDBStruct> {
  const container = getTasksContainer(client);
  const { resource } = await container.items.create<ITaskDBStruct>(taskData);

  if (!resource) {
    throw new Error("Failed to create task");
  }

  return resource;
}

/**
 * Updates a task with patch operations
 * @param client - Cosmos DB client
 * @param taskId - Task ID
 * @param organizationId - Organization ID
 * @param updates - Patch operations
 * @returns Updated task
 */
export async function updateTask(
  client: CosmosClient,
  taskId: string,
  organizationId: number,
  updates: Array<{ op: "replace" | "add" | "remove" | "set" | "incr"; path: string; value?: any }>
): Promise<ITaskDBStruct> {
  const container = getTasksContainer(client);
  const { resource } = await container
    .item(taskId, String(organizationId))
    .patch<ITaskDBStruct>(updates);

  if (!resource) {
    throw new Error("Failed to update task");
  }

  return resource;
}

/**
 * Soft deletes a task (marks as deleted instead of removing)
 * @param client - Cosmos DB client
 * @param taskId - Task ID
 * @param organizationId - Organization ID
 * @returns Updated task
 */
export async function softDeleteTask(
  client: CosmosClient,
  taskId: string,
  organizationId: number
): Promise<void> {
  const container = getTasksContainer(client);

  await container.item(taskId, String(organizationId)).patch([
    { op: "replace" as const, path: "/isDeleted", value: true },
    { op: "replace" as const, path: "/updatedAt", value: new Date() },
  ]);
}

/**
 * Hard deletes a task (permanent removal)
 * @param client - Cosmos DB client
 * @param taskId - Task ID
 * @param organizationId - Organization ID
 */
export async function hardDeleteTask(
  client: CosmosClient,
  taskId: string,
  organizationId: number
): Promise<void> {
  const container = getTasksContainer(client);

  try {
    await container.item(taskId, String(organizationId)).delete();
  } catch (e: any) {
    if (e.code !== 404) {
      throw e;
    }
    // Ignore 404 errors - task already deleted
  }
}

/**
 * Bulk deletes multiple tasks (soft delete)
 * @param client - Cosmos DB client
 * @param taskIds - Array of task IDs to delete
 * @param organizationId - Organization ID
 * @returns Count of successfully deleted tasks
 */
export async function bulkSoftDeleteTasks(
  client: CosmosClient,
  taskIds: string[],
  organizationId: number
): Promise<number> {
  const container = getTasksContainer(client);
  let successCount = 0;

  const deletePromises = taskIds.map((taskId) =>
    softDeleteTask(client, taskId, organizationId)
      .then(() => {
        successCount++;
      })
      .catch((e) => {
        // Log error but continue with other deletions
        console.error(`Failed to delete task ${taskId}:`, e.message);
      })
  );

  await Promise.all(deletePromises);

  return successCount;
}

/**
 * Updates task status
 * @param client - Cosmos DB client
 * @param taskId - Task ID
 * @param organizationId - Organization ID
 * @param newStatus - New status value
 * @returns Updated task
 */
export async function updateTaskStatus(
  client: CosmosClient,
  taskId: string,
  organizationId: number,
  newStatus: number
): Promise<ITaskDBStruct> {
  return updateTask(client, taskId, organizationId, [
    { op: "replace" as const, path: "/status", value: newStatus },
    { op: "replace" as const, path: "/updatedAt", value: new Date() },
  ]);
}
