import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import client from "../config/Cosmos";

// Whitelist valid values
const VALID_STATUSES = ['todo', 'in-progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_SORT_FIELDS = ['createdAt', 'dueDate', 'priority', 'title', 'status', 'updatedAt'];
const VALID_SORT_DIRECTIONS = ['ASC', 'DESC'];

// Escape SQL input
function escapeSqlInput(input: string): string {
    return input
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .trim();
}

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const organizationId = escapeSqlInput(request.query.get('organizationId') || '');
    const search = request.query.get('search') || '';
    const status = request.query.get('status') || '';
    const dueDate = request.query.get('dueDate') || '';
    const priority = request.query.get('priority') || '';
    const orderBy = request.query.get('order_by') || 'createdAt';
    const sortBy = (request.query.get('sort_by') || 'ASC').toUpperCase();
    const limit = Math.min(Math.max(parseInt(request.query.get('limit') || '10', 10), 1), 100);
    const page = Math.max(parseInt(request.query.get('page') || '1', 10), 1);

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
        return {
            jsonBody: {
                error: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`
            },
            status: 400
        };
    }

    // Validate priority
    if (priority && !VALID_PRIORITIES.includes(priority)) {
        return {
            jsonBody: {
                error: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`
            },
            status: 400
        };
    }

    // Validate order_by field
    if (!VALID_SORT_FIELDS.includes(orderBy)) {
        return {
            jsonBody: {
                error: `Invalid order_by field. Allowed values: ${VALID_SORT_FIELDS.join(', ')}`
            },
            status: 400
        };
    }

    // Validate sort_by direction
    if (!VALID_SORT_DIRECTIONS.includes(sortBy)) {
        return {
            jsonBody: {
                error: `Invalid sort_by. Allowed values: ${VALID_SORT_DIRECTIONS.join(', ')}`
            },
            status: 400
        };
    }

    // Require organizationId
    if (!organizationId) {
        return {
            jsonBody: {
                error: "organizationId is required"
            },
            status: 400
        };
    }

    const conditions: string[] = [`c.organizationId = '${organizationId}'`];

    if (search) {
        const safeSearch = escapeSqlInput(search);
        conditions.push(`(CONTAINS(c.title, '${safeSearch}') OR CONTAINS(c.description, '${safeSearch}'))`);
    }
    if (status) {
        conditions.push(`c.status = '${status}'`);
    }
    if (dueDate) {
        conditions.push(`c.dueDate = '${dueDate}'`);
    }
    if (priority) {
        conditions.push(`c.priority = '${priority}'`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countQuery = `SELECT VALUE COUNT(1) FROM c ${whereClause}`;
    const countResult = await client.database("TaskApp")
        .container("Tasks")
        .items.query(countQuery)
        .fetchNext();
    const total = countResult.resources[0] || 0;

    const orderClause = `ORDER BY c.${orderBy} ${sortBy}`;
    const offset = (page - 1) * limit;
    const paginationClause = `OFFSET ${offset} LIMIT ${limit}`;

    const query = `SELECT * FROM c ${whereClause} ${orderClause} ${paginationClause}`;
    context.log(`Executing query: ${query}`);

    const tasks = await client.database("TaskApp")
        .container("Tasks")
        .items.query(query)
        .fetchNext();

    const response = {
        data: tasks.resources,
        total: total,
        filters: {
            search: search || null,
            status: status || null,
            dueDate: dueDate || null,
            priority: priority || null,
            order_by: orderBy,
            sort_by: sortBy,
            limit: limit,
            page: page
        }
    };
    return {
        jsonBody: response,
        status: 200
    };
}

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTasks
});
