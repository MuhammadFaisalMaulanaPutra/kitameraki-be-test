import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import client from "../config/Cosmos";
import { PatchOperation } from "@azure/cosmos";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const body = await request.json() as Record<string, any>;
    const taskId = request.params.id;
    const organizationId = body.organizationId;

    if (!taskId) {
        return { jsonBody: { message: "Task ID is required" }, status: 400 };
    }

    if (!organizationId) {
        return { jsonBody: { message: "Organization ID is required" }, status: 400 };
    }

    try {
        const patchRequests: PatchOperation[] = Object.entries(body)
            .filter(([key]) => key !== "id")
            .map(([key, value]) => ({
                op: "set",
                path: `/${key}`,
                value
            }));

        const updatedTask = await client
            .database("TaskApp")
            .container("Tasks")
            .item(taskId, organizationId)
            .patch(patchRequests);

        return { jsonBody: updatedTask.resource, status: 200 };

    } catch (error: any) {
        if (error.code === 404 || error.statusCode === 404) {
            return { jsonBody: { message: "Task not found" }, status: 404 };
        }

        return { jsonBody: { message: error.message }, status: 500 };
    }
};

app.http('UpdateTask', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'UpdateTask/{id}',
    handler: UpdateTask
});
