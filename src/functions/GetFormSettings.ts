import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getFormSettingsContainer } from "../services/cosmosClient";

export async function GetFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get("organizationId");
        if (!organizationId) {
            return { status: 400, jsonBody: { error: "organizationId query parameter is required" } };
        }

        const container = getFormSettingsContainer();
        const { resources } = await container.items
            .query({
                query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
                parameters: [{ name: "@organizationId", value: organizationId }],
            })
            .fetchAll();

        return {
            status: 200,
            jsonBody: resources[0] ?? { id: null, organizationId, fields: [] },
        };
    } catch (error) {
        context.error("GetFormSettings failed", error);
        return { status: 500, jsonBody: { error: "Failed to fetch form settings" } };
    }
}

app.http("GetFormSettings", {
    methods: ["GET"],
    authLevel: "function",
    handler: GetFormSettings,
});