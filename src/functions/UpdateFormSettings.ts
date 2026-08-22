import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { client, databaseId } from "../shared/cosmos";

export async function UpdateFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as Record<string, any>;
        const organizationId = request.query.get('organizationId');

        if (!organizationId || !body.customFields) {
            return { status: 400, body: "Invalid payload." };
        }

        const payload = { ...body, id: `form-settings-${organizationId}`, organizationId };

        const { resource } = await client.database(databaseId)
            .container("Settings")
            .items.upsert(payload);

        return { jsonBody: resource, status: 200 };
    } catch (error) {
        context.error("Error updating settings:", error);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('UpdateFormSettings', { methods: ['PUT'], authLevel: 'anonymous', handler: UpdateFormSettings });
