import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import client from "../config/Cosmos";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const taskId = request.params.id;
    const organizationId = request.params.organizationId;

    if (!taskId) {
        return { jsonBody: { message: "Task ID is required" }, status: 400 };
    }

    if (!organizationId) {
        return { jsonBody: { message: "Organization ID is required" }, status: 400 };
    }

    try {
        await client.database("TaskApp")
            .container("Tasks")
            .item(taskId, organizationId)
            .delete();

        return { jsonBody: { message: "Task deleted" }, status: 200 };
    } catch (error: any) {
        if (error.code === 404 || error.statusCode === 404) {
            return { jsonBody: { message: "Task not found" }, status: 404 };
        }

        return { jsonBody: { message: error.message }, status: 500 };
    }
};

app.http('DeleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'DeleteTask/{id}/{organizationId}',
    handler: DeleteTask
});
