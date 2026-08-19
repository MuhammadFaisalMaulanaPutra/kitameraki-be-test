import { PatchOperation, SqlQuerySpec } from '@azure/cosmos';
import { getTasksContainer } from '../config/cosmosClient';
import { ListTasksQuery, PagedResult, Task } from '../models/task.types';
import { NotFoundError } from '../utils/errors';
import { stripCosmosMetadata } from '../utils/cosmos';

/**
 * All direct Cosmos DB access for tasks lives here. Nothing outside
 * this file should import `@azure/cosmos` for task operations — that
 * keeps the SDK and query details in one place and makes the rest of
 * the codebase testable by mocking this module.
 */

export async function listTasks(query: ListTasksQuery): Promise<PagedResult<Task>> {
    const container = getTasksContainer();

    // Parameterized query: user-controlled values are passed as
    // `parameters`, never concatenated into the query string, which
    // prevents NoSQL injection.
    const conditions = ['c.organizationId = @organizationId'];
    const parameters: SqlQuerySpec['parameters'] = [
        { name: '@organizationId', value: query.organizationId },
    ];

    if (query.status) {
        conditions.push('c.status = @status');
        parameters.push({ name: '@status', value: query.status });
    }

    if (query.priority) {
        conditions.push('c.priority = @priority');
        parameters.push({ name: '@priority', value: query.priority });
    }

    if (query.search) {
        conditions.push('CONTAINS(LOWER(c.title), @search)');
        parameters.push({ name: '@search', value: query.search.toLowerCase() });
    }

    const querySpec: SqlQuerySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c._ts DESC`,
        parameters,
    };

    // Fetch one extra item beyond the page size so we can tell the
    // caller whether there is a next page, without a separate COUNT query.
    const offset = (query.page - 1) * query.pageSize;
    const iterator = container.items.query<Task>({
        ...querySpec,
        query: `${querySpec.query} OFFSET ${offset} LIMIT ${query.pageSize + 1}`,
    });

    const { resources } = await iterator.fetchAll();
    const hasMore = resources.length > query.pageSize;

    return {
        items: resources.slice(0, query.pageSize).map(stripCosmosMetadata),
        page: query.page,
        pageSize: query.pageSize,
        hasMore,
    };
}

export async function getTaskById(id: string, organizationId: string): Promise<Task> {
    const container = getTasksContainer();
    const { resource } = await container.item(id, organizationId).read<Task>();

    if (!resource) {
        throw new NotFoundError(`Task "${id}" was not found.`);
    }

    return stripCosmosMetadata(resource);
}

export async function createTask(task: Task): Promise<Task> {
    const container = getTasksContainer();
    const { resource } = await container.items.create<Task>(task);

    if (!resource) {
        throw new Error('Cosmos DB did not return the created task.');
    }

    return stripCosmosMetadata(resource);
}

export async function updateTask(
    id: string,
    organizationId: string,
    patchOperations: PatchOperation[]
): Promise<Task> {
    const container = getTasksContainer();

    try {
        const { resource } = await container.item(id, organizationId).patch<Task>(patchOperations);

        if (!resource) {
            throw new NotFoundError(`Task "${id}" was not found.`);
        }

        return stripCosmosMetadata(resource);
    } catch (error: any) {
        if (error?.code === 404) {
            throw new NotFoundError(`Task "${id}" was not found.`);
        }
        throw error;
    }
}

export async function deleteTask(id: string, organizationId: string): Promise<void> {
    const container = getTasksContainer();

    try {
        await container.item(id, organizationId).delete();
    } catch (error: any) {
        if (error?.code === 404) {
            throw new NotFoundError(`Task "${id}" was not found.`);
        }
        throw error;
    }
}

/**
 * Deletes multiple tasks concurrently and reports which ones failed,
 * instead of the previous `forEach(async ...)` pattern which neither
 * awaited the deletes nor surfaced any failures to the caller.
 */
export async function bulkDeleteTasks(
    ids: string[],
    organizationId: string
): Promise<{ deleted: string[]; failed: { id: string; reason: string }[] }> {
    const results = await Promise.allSettled(
        ids.map((id) => deleteTask(id, organizationId).then(() => id))
    );

    const deleted: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            deleted.push(result.value);
        } else {
            failed.push({ id: ids[index], reason: result.reason?.message ?? 'Unknown error' });
        }
    });

    return { deleted, failed };
}