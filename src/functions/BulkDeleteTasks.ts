import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../services/cosmosClient";

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get("organizationId");
        if (!organizationId) {
            return { status: 400, jsonBody: { error: "organizationId query parameter is required" } };
        }

        const body = await request.json();
        if (!Array.isArray(body) || !body.every((id) => typeof id === "string")) {
            return { status: 400, jsonBody: { error: "Body must be an array of task id strings" } };
        }

        const container = getTasksContainer();
        const results = await Promise.allSettled(
            body.map((id) => container.item(id, organizationId).delete())
        );

        const failed = results
            .map((r, i) => ({ id: body[i], result: r }))
            .filter((r) => r.result.status === "rejected");

        if (failed.length > 0) {
            context.warn("Some deletes failed", failed.map((f) => f.id));
            return {
                status: 207,
                jsonBody: {
                    message: "Some tasks failed to delete",
                    failedIds: failed.map((f) => f.id),
                },
            };
        }

        return { status: 204 };
    } catch (error) {
        context.error("BulkDeleteTasks failed", error);
        return { status: 500, jsonBody: { error: "Failed to bulk delete tasks" } };
    }
}

app.http("BulkDeleteTasks", {
    methods: ["DELETE"],
    authLevel: "function",
    handler: BulkDeleteTasks,
});