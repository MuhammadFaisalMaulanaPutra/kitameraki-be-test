import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";
import { getFormSettingsContainer } from "../services/cosmosClient";
import { formSettingsSchema } from "../schemas/formSettings.schema";

export async function UpdateFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get("organizationId");
        if (!organizationId) {
            return { status: 400, jsonBody: { error: "organizationId query parameter is required" } };
        }

        const rawBody = await request.json();
        const parseResult = formSettingsSchema.omit({ id: true, organizationId: true }).safeParse(rawBody);

        if (!parseResult.success) {
            return { status: 400, jsonBody: { error: "Invalid form settings payload", details: parseResult.error.flatten() } };
        }

        const container = getFormSettingsContainer();

        const { resources: existing } = await container.items
            .query({
                query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
                parameters: [{ name: "@organizationId", value: organizationId }],
            })
            .fetchAll();

        const settingsDoc = {
            id: existing[0]?.id ?? randomUUID(),
            organizationId,
            fields: parseResult.data.fields,
        };

        const { resource } = await container.items.upsert(settingsDoc);

        return { status: 200, jsonBody: resource };
    } catch (error) {
        context.error("UpdateFormSettings failed", error);
        return { status: 500, jsonBody: { error: "Failed to update form settings" } };
    }
}

app.http("UpdateFormSettings", {
    methods: ["PUT"],
    authLevel: "function",
    handler: UpdateFormSettings,
});