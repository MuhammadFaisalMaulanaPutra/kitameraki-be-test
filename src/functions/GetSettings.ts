import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";

async function readSettingsDocument(organizationId: string): Promise<Record<string, unknown> | null> {
    const container = getTasksContainer();
    const candidates = [organizationId, organizationId.toUpperCase(), organizationId.toLowerCase()]
        .filter((value, index, list) => list.indexOf(value) === index);

    for (const candidate of candidates) {
        const settingsId = `settings-${candidate}`;
        try {
            const readResult = await container.item(settingsId, candidate).read();
            if (readResult.resource) {
                return readResult.resource as Record<string, unknown>;
            }
        } catch {
            // Try next candidate.
        }
    }

    const fallback = await container.items.query({
        query: "SELECT TOP 1 * FROM c WHERE LOWER(c.organizationId) = @organizationId AND c.entityType = @entityType",
        parameters: [
            { name: "@organizationId", value: organizationId.toLowerCase() },
            { name: "@entityType", value: "settings" }
        ]
    }).fetchAll();

    if (fallback.resources.length > 0) {
        return fallback.resources[0] as Record<string, unknown>;
    }

    return null;
}

export async function GetSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get("organizationId")?.trim();

        if (!organizationId) {
            return { status: 400, jsonBody: { message: "Query parameter 'organizationId' is required." } };
        }

        const settingsDocument = await readSettingsDocument(organizationId);
        if (!settingsDocument) {
            return { status: 200, jsonBody: { organizationId, settings: [] } };
        }

        const fields = Array.isArray(settingsDocument.fields)
            ? settingsDocument.fields
            : [];

        return {
            status: 200,
            jsonBody: {
                organizationId,
                settings: fields,
                updatedAt: settingsDocument.updatedAt ?? null
            }
        };
    } catch (error) {
        const message = (error as Error).message || "Unknown error";
        context.error("GetSettings failed", error);
        return { status: 500, jsonBody: { message: "Failed to get settings.", error: message } };
    }
}

app.http("GetSettings", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "settings",
    handler: GetSettings
});