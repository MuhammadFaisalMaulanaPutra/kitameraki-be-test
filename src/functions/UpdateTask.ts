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

        const restrictedKeys = ['id', 'organizationId', '_rid', '_self', '_etag', '_attachments', '_ts'];

        let patchRequests = [];

        for (let key in body) {
            if (!restrictedKeys.includes(key)) {
                patchRequests.push({
                    op: "replace" as const,
                    path: `/${key}`,
                    value: body[key]
                });
            }
        }

        if (patchRequests.length === 0) {
            return { status: 400, body: "No valid fields to update." };
        }

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