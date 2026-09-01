import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);

        const taskId = request.query.get("id");
        const organizationId = request.query.get("organizationId");

        if (!taskId || !organizationId) {
            return { status: 400, jsonBody: { message: "Query parameters 'id' and 'organizationId' are required." } };
        }

        await getTasksContainer().item(taskId, organizationId).delete();

        return { status: 200 };
    } catch (error) {
        context.error("DeleteTask failed", error);
        return { status: 500, jsonBody: { message: "Failed to delete task.", error: (error as Error).message } };
    }
};

app.http('DeleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: DeleteTask
});
