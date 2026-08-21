import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { client, databaseId, containerId } from "../shared/cosmos";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as Record<string, any>;
        const taskId = request.query.get('id');
        const organizationId = request.query.get('organizationId');

        if (!taskId || !organizationId) {
            return { status: 400, body: "Missing id or organizationId parameter." };
        }

        const patchRequests = Object.keys(body).map(key => ({
            op: "replace" as const,
            path: `/${key}`,
            value: body[key]
        }));

        const { resource } = await client.database(databaseId)
            .container(containerId)
            .item(taskId, organizationId)
            .patch(patchRequests);

        return { jsonBody: resource, status: 200 };
    } catch (error) {
        context.error("Error updating task:", error);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('UpdateTask', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    handler: UpdateTask
});