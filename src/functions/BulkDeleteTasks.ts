import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { parseOrThrow, withErrorHandling } from "../lib/http";
import { bulkDeleteSchema, organizationParamsSchema } from "../lib/taskSchema";
import { bulkDeleteTasks } from "../services/taskService";

export async function BulkDeleteTasks(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const ids = parseOrThrow(bulkDeleteSchema, await request.json());
    const params = parseOrThrow(organizationParamsSchema, {
        organizationId: request.query.get("organizationId")
    });
    await bulkDeleteTasks(ids, params.organizationId);

    return { status: 204 };
}

app.http("BulkDeleteTasks", {
    methods: ["POST"],
    route: "tasks/bulk-delete",
    authLevel: "anonymous",
    handler: withErrorHandling(BulkDeleteTasks)
});
