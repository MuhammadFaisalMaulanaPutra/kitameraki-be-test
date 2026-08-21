import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { client, databaseId, containerId } from "../shared/cosmos";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as Record<string, any>;

        if (!body || !body.title || !body.organizationId) {
            return { status: 400, body: "Missing required fields: title, organizationId." };
        }

        const { resource } = await client.database(databaseId)
            .container(containerId)
            .items.create(body);

        return { jsonBody: resource, status: 201 };
    } catch (error) {
        context.error("Error creating task:", error);
        return { status: 500, body: "Internal server error" };
    }
};

app.http('InsertTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: InsertTask
});
