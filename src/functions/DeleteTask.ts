import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { client, databaseId, containerId } from "../shared/cosmos";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const taskId = request.query.get('id');
        const organizationId = request.query.get('organizationId');

        if (!taskId || !organizationId) {
            return { status: 400, body: "Missing id or organizationId parameter." };
        }

        await client.database(databaseId)
            .container(containerId)
            .item(taskId, organizationId)
            .delete();

        return { status: 204 };
    } catch (error: any) {
        if (error.code === 404) {
             return { status: 404, body: "Task not found." };
        }
        context.error("Error deleting task:", error);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('DeleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: DeleteTask
});
