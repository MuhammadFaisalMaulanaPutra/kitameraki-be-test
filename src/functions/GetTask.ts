import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);

        const taskId = request.query.get("id");
        const organizationId = request.query.get("organizationId");
        if (!taskId || !organizationId) {
            return { status: 400, jsonBody: { message: "Query parameters 'id' and 'organizationId' are required." } };
        }

        const task = await getTasksContainer().item(taskId, organizationId).read();

        return { jsonBody: task.resource, status: 200 };
    } catch (error) {
        context.error("GetTask failed", error);
        return { status: 500, jsonBody: { message: "Failed to get task.", error: (error as Error).message } };
    }
};

app.http('GetTask', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTask
});
