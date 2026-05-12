import { CosmosClient, PatchOperation } from '@azure/cosmos';
import { DB_NAME, TASKS_CONTAINER } from '../libs/cosmosClient';
import { TaskDocument, PaginatedResult } from '../interfaces/task';

function container(client: CosmosClient) {
  return client.database(DB_NAME).container(TASKS_CONTAINER);
}

export async function listTasks(
  client: CosmosClient,
  organizationId: number,
  pageNumber: number,
  pageSize: number,
  status?: number,
  searchTerm?: string,
  sortField = 'createdAt',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<PaginatedResult<TaskDocument>> {
  const c = container(client);
  const offset = (pageNumber - 1) * pageSize;

  const conditions = [
    'c.organizationId = @organizationId',
    'c.isDeleted = false',
  ];
  const params: { name: string; value: any }[] = [
    { name: '@organizationId', value: organizationId },
  ];

  if (typeof status === 'number') {
    conditions.push('c.status = @status');
    params.push({ name: '@status', value: status });
  }

  if (searchTerm) {
    conditions.push('(CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.description), LOWER(@search)))');
    params.push({ name: '@search', value: searchTerm });
  }

  const where = conditions.join(' AND ');

  const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status'];
  const safeSort = VALID_SORT_FIELDS.includes(sortField) ? sortField : 'createdAt';
  const safeOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const [countResult, dataResult] = await Promise.all([
    c.items.query<number>({
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${where}`,
      parameters: params,
    }).fetchAll(),
    c.items.query<TaskDocument>({
      query: `SELECT * FROM c WHERE ${where} ORDER BY c.${safeSort} ${safeOrder} OFFSET ${offset} LIMIT ${pageSize}`,
      parameters: params,
    }).fetchAll(),
  ]);

  const totalCount = countResult.resources[0] ?? 0;
  return {
    items: dataResult.resources,
    totalCount,
    pageNumber,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTaskById(
  client: CosmosClient,
  taskId: string,
  organizationId: number
): Promise<TaskDocument | null> {
  try {
    const { resource } = await container(client)
      .item(taskId, organizationId)
      .read<TaskDocument>();
    if (!resource || resource.isDeleted) return null;
    return resource;
  } catch (e: any) {
    if (e.code === 404) return null;
    throw e;
  }
}

export async function createTask(
  client: CosmosClient,
  data: Omit<TaskDocument, 'id'> & { id?: string }
): Promise<TaskDocument> {
  const { resource } = await container(client).items.create<TaskDocument>(data as TaskDocument);
  if (!resource) throw new Error('Failed to create task');
  return resource;
}

export async function patchTask(
  client: CosmosClient,
  taskId: string,
  organizationId: number,
  ops: PatchOperation[]
): Promise<TaskDocument> {
  const { resource } = await container(client)
    .item(taskId, organizationId)
    .patch<TaskDocument>(ops);
  if (!resource) throw new Error('Failed to update task');
  return resource;
}

export async function softDeleteTask(
  client: CosmosClient,
  taskId: string,
  organizationId: number
): Promise<void> {
  await container(client).item(taskId, organizationId).patch([
    { op: 'replace', path: '/isDeleted', value: true },
    { op: 'replace', path: '/updatedAt', value: new Date().toISOString() },
  ]);
}

export async function bulkSoftDelete(
  client: CosmosClient,
  taskIds: string[],
  organizationId: number
): Promise<{ deleted: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    taskIds.map((id) => softDeleteTask(client, id, organizationId).then(() => id))
  );

  const deleted: string[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') deleted.push(taskIds[i]);
    else failed.push(taskIds[i]);
  });
  return { deleted, failed };
}
