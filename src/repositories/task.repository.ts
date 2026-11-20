import { SqlParameter, SqlQuerySpec } from '@azure/cosmos';
import { getTaskContainer } from '../config/cosmos.js';
import { TaskQueryFilterDTO, PaginatedTasksDTO, UpdateTaskDTO } from '../dtos/task.dto.js';
import { Task } from '../models/task.model.js';
import { ignoreNotFound, toPatchOperations } from '../utils/cosmos.util.js';

const SORT_FIELD_MAP: Readonly<Record<string, string>> = Object.freeze({
    dueDate: 'c.dueDate',
    priority: 'c.priority',
    status: 'c.status',
    title: 'c.title',
    createdAt: 'c.createdAt',
});

export class TaskRepository {
    async create(task: Task): Promise<Task> {
        const container = getTaskContainer();
        const { resource } = await container.items.create<Task>(task);
        return resource!;
    }

    async findById(id: string, organizationId: string): Promise<Task | null> {
        const container = getTaskContainer();
        const result = await ignoreNotFound(container.item(id, organizationId).read<Task>());
        return result?.resource || null;
    }

    async update(id: string, organizationId: string, updates: UpdateTaskDTO): Promise<Task | null> {
        const operations = toPatchOperations(updates);
        if (operations.length === 0) {
            return this.findById(id, organizationId);
        }
        const container = getTaskContainer();
        const result = await ignoreNotFound(
            container.item(id, organizationId).patch<Task>(operations)
        );
        return result?.resource || null;
    }

    async delete(id: string, organizationId: string): Promise<boolean> {
        const container = getTaskContainer();
        const result = await ignoreNotFound(container.item(id, organizationId).delete());
        return result !== null;
    }

    async bulkDelete(ids: string[], organizationId: string): Promise<number> {
        const deletePromises = ids.map((id) => this.delete(id, organizationId));
        const results = await Promise.all(deletePromises);
        return results.filter(Boolean).length;
    }

    async findWithFilters(filters: TaskQueryFilterDTO): Promise<PaginatedTasksDTO> {
        const container = getTaskContainer();
        const {
            organizationId,
            search,
            status,
            priority,
            sortBy,
            sortOrder = 'desc',
            page = 1,
            pageSize = 10,
        } = filters;

        const safePage = Math.max(1, page);
        const safePageSize = Math.min(Math.max(1, pageSize), 100);
        const offset = Math.max(0, (safePage - 1) * safePageSize);
        const conditions: string[] = ['c.organizationId = @organizationId'];
        const parameters: SqlParameter[] = [{ name: '@organizationId', value: organizationId }];

        if (status) {
            conditions.push('c.status = @status');
            parameters.push({ name: '@status', value: status });
        }
        if (priority) {
            conditions.push('c.priority = @priority');
            parameters.push({ name: '@priority', value: priority });
        }
        if (search && search.trim() !== '') {
            conditions.push(
                '(CONTAINS(c.title, @search, true) OR CONTAINS(c.description, @search, true))'
            );
            parameters.push({ name: '@search', value: search.trim() });
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const targetSortField = sortBy && SORT_FIELD_MAP[sortBy] ? SORT_FIELD_MAP[sortBy] : 'c._ts';
        const targetSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const countQuerySpec: SqlQuerySpec = {
            query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
            parameters: parameters,
        };

        const dataQuerySpec: SqlQuerySpec = {
            query: `SELECT * FROM c ${whereClause} ORDER BY ${targetSortField} ${targetSortOrder} OFFSET @offset LIMIT @pageSize`,
            parameters: [
                ...parameters,
                { name: '@offset', value: offset },
                { name: '@pageSize', value: safePageSize },
            ],
        };

        const feedOptions = { partitionKey: organizationId };

        const [countResponse, dataResponse] = await Promise.all([
            container.items.query<number>(countQuerySpec, feedOptions).fetchAll(),
            container.items.query<Task>(dataQuerySpec, feedOptions).fetchAll(),
        ]);

        const total = countResponse.resources[0] || 0;
        const items = dataResponse.resources;
        const totalPages = Math.ceil(total / safePageSize);

        return { items, total, page: safePage, pageSize: safePageSize, totalPages };
    }
}

export const taskRepository = new TaskRepository();