import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);
        const body = await request.json() as string[];
        const organizationId = request.query.get("organizationId");

        if (!organizationId) {
            return { status: 400, jsonBody: { message: "Query parameter 'organizationId' is required." } };
        }

        if (!Array.isArray(body)) {
            return { status: 400, jsonBody: { message: "Request body must be an array of task IDs." } };
        }

        const container = getTasksContainer();
        await Promise.all(body.map((taskId) => container.item(taskId, organizationId).delete()));

        return { status: 200 };
    } catch (error) {
        context.error("BulkDeleteTasks failed", error);
        return { status: 500, jsonBody: { message: "Failed to bulk delete tasks.", error: (error as Error).message } };
    }
};

app.http('BulkDeleteTasks', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: BulkDeleteTasks
});
