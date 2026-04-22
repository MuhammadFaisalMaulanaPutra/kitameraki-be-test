import { client } from "../db/db";

const container = client.database("TaskApp").container("Tasks");



export const getAllTasks = async (filters: {
  organizationId?: string;
  search?: string;
  status?: string;
  limit: number;
  continuationToken?: string;
}) => {
  let query = "SELECT * FROM c WHERE 1=1";
  const parameters: any[] = [];

  if (filters.organizationId) {
    query += " AND c.organizationId = @orgId";
    parameters.push({ name: "@orgId", value: filters.organizationId });
  }

  if (filters.status) {
    query += " AND c.status = @status";
    parameters.push({ name: "@status", value: filters.status });
  }

  if (filters.search) {
    query += " AND CONTAINS(LOWER(c.title), LOWER(@search))";
    parameters.push({ name: "@search", value: filters.search });
  }

  const iterator = container.items.query(
    { query, parameters },
    {
      maxItemCount: filters.limit,
      continuationToken: filters.continuationToken,
    }
  );

  const response = await iterator.fetchNext();

  return {
    items: response.resources,
    continuationToken: response.continuationToken,
  };
};

export const getTaskById = async (taskId: string, organizationId: string) => {
  const { resource } = await container
    .item(taskId, organizationId)
    .read();

  return resource; 
};

export const findTaskByNormalizedTitle = async (normalizedTitle: string,organizationId: string) => {
  const query = {
    query: `
      SELECT * FROM c 
      WHERE c.normalizedTitle = @title 
      AND c.organizationId = @orgId
    `,
    parameters: [
      { name: "@title", value: normalizedTitle },
      { name: "@orgId", value: organizationId }
    ]
  };

  const { resources } = await container.items.query(query).fetchAll();

  return resources[0];
};

export const insertTask = async (task: any) => {
  const { resource } = await container.items.create(task);
  return resource;
};

export const updateTask = async (
  taskId: string,
  organizationId: string,
  patchOperations: any[]
) => {
  const { resource } = await container
    .item(taskId, organizationId)
    .patch(patchOperations);

  return resource;
};

export const deleteTask = async (taskId: string, organizationId: string) => {
  const { resource } = await container
    .item(taskId, organizationId)
    .delete();

  return resource;
};

export const deleteTaskBulk = async (taskId: string, organizationId: string) => {
  return container.item(taskId, organizationId).delete();
};