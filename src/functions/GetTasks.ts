import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { COSMOS_CONTAINER_NAME, ensureContainer } from "../config/cosmos";
import { ok, handleError } from "../shared/http";
import { requireQuery, normalizePagination } from "../shared/validation";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = requireQuery(request, "organizationId");
        const { page, pageSize } = normalizePagination(request);
        const search = request.query.get('search')?.trim() || undefined;
        const status = request.query.get('status')?.trim() || undefined;

        const container = await ensureContainer(COSMOS_CONTAINER_NAME);

        const offset = (page - 1) * pageSize;

        const baseQuery = `
            SELECT * FROM c
            WHERE c.organizationId = @organizationId
            ${search ? "AND CONTAINS(LOWER(c.title), LOWER(@search))" : ""}
            ${status ? "AND c.status = @status" : ""}
            ORDER BY c.updatedAt DESC
            OFFSET @offset LIMIT @limit
        `;

        const parameters: any[] = [
            { name: "@organizationId", value: organizationId },
            { name: "@offset", value: offset },
            { name: "@limit", value: pageSize },
        ];

        if (search) parameters.push({ name: "@search", value: search });
        if (status) parameters.push({ name: "@status", value: status });

        const { resources } = await container.items
            .query({ query: baseQuery, parameters })
            .fetchAll();

        const countQuery = `
            SELECT VALUE COUNT(1) FROM c
            WHERE c.organizationId = @organizationId
            ${search ? "AND CONTAINS(LOWER(c.title), LOWER(@search))" : ""}
            ${status ? "AND c.status = @status" : ""}
        `;

        const countResult = await container.items
            .query({
                query: countQuery,
                parameters: parameters.filter(p => p.name !== "@offset" && p.name !== "@limit")
            })
            .fetchAll();

        const total = countResult.resources[0] ?? 0;

        return ok({
            items: resources,
            page,
            pageSize,
            total
        });

    } catch (error) {
        return handleError(context, error, "GetTasks");
    }
}

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTasks
});
