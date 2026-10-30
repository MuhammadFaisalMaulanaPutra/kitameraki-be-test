import type { TaskListQuery } from "./taskSchema";

export function buildTaskListQueries(query: TaskListQuery) {
    const conditions = ["c.organizationId = @organizationId"];
    const parameters: { name: string; value: string | number }[] = [
        { name: "@organizationId", value: query.organizationId }
    ];

    if (query.search) {
        conditions.push("CONTAINS(c.title, @search, true)");
        parameters.push({ name: "@search", value: query.search });
    }
    if (query.status) {
        conditions.push("c.status = @status");
        parameters.push({ name: "@status", value: query.status });
    }
    if (query.priority) {
        conditions.push("c.priority = @priority");
        parameters.push({ name: "@priority", value: query.priority });
    }

    const where = conditions.join(" AND ");
    return {
        itemsQuery: {
            query: `SELECT * FROM c WHERE ${where} ORDER BY c.createdAt DESC, c.id ASC OFFSET @offset LIMIT @limit`,
            parameters: [
                ...parameters,
                { name: "@offset", value: (query.page - 1) * query.pageSize },
                { name: "@limit", value: query.pageSize }
            ]
        },
        countQuery: {
            query: `SELECT VALUE COUNT(1) FROM c WHERE ${where}`,
            parameters
        }
    };
}
