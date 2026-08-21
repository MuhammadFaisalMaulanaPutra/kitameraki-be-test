import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { client, databaseId, containerId } from "../shared/cosmos";

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as string[];
        const organizationId = request.query.get('organizationId');

        if (!Array.isArray(body) || body.length === 0 || !organizationId) {
            return { status: 400, body: "Invalid payload or missing organizationId." };
        }

        const container = client.database(databaseId).container(containerId);

        await Promise.all(
            body.map(taskId => container.item(taskId, organizationId).delete())
        );

        return { status: 204 };
    } catch (error) {
        context.error("Error during bulk delete:", error);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('BulkDeleteTasks', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: BulkDeleteTasks
});