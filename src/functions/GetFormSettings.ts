import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { client, databaseId } from "../shared/cosmos";

export async function GetFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get('organizationId');
        if (!organizationId) return { status: 400, body: "Missing organizationId." };

        const { resource } = await client.database(databaseId)
            .container("Settings")
            .item(`form-settings-${organizationId}`, organizationId)
            .read();

        return { jsonBody: resource || { customFields: [] }, status: 200 };
    } catch (error) {
        context.error("Error fetching form settings:", error);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('GetFormSettings', { methods: ['GET'], authLevel: 'anonymous', handler: GetFormSettings });
