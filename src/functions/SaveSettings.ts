import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";
import { isFieldSettingsArray } from "./payloads";

type SaveSettingsBody = {
    organizationId?: unknown;
    settings?: unknown;
};

function extractOrganizationId(body: SaveSettingsBody, queryOrganizationId: string | null): string {
    if (typeof body.organizationId === "string" && body.organizationId.trim()) {
        return body.organizationId.trim();
    }

    return queryOrganizationId?.trim() || "";
}

export async function SaveSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const parsedBody = await request.json();
        const queryOrganizationId = request.query.get("organizationId")?.trim() || null;

        if (Array.isArray(parsedBody)) {
            const organizationId = queryOrganizationId;
            if (!organizationId) {
                return {
                    status: 400,
                    jsonBody: {
                        message: "Query parameter 'organizationId' is required when body is a settings array."
                    }
                };
            }

            if (!isFieldSettingsArray(parsedBody)) {
                return {
                    status: 400,
                    jsonBody: { message: "Settings body must match FieldSetting[] schema." }
                };
            }

            const now = new Date().toISOString();
            const settingsDocument = {
                id: `settings-${organizationId}`,
                organizationId,
                entityType: "settings",
                fields: parsedBody,
                updatedAt: now
            };

            const saved = await getTasksContainer().items.upsert(settingsDocument);
            return { status: 200, jsonBody: saved.resource };
        }

        if (typeof parsedBody !== "object" || parsedBody === null) {
            return {
                status: 400,
                jsonBody: { message: "Request body must be a settings array or an object with organizationId and settings." }
            };
        }

        const body = parsedBody as SaveSettingsBody;
        const organizationId = extractOrganizationId(body, queryOrganizationId);
        const settings = body.settings;

        if (!organizationId) {
            return {
                status: 400,
                jsonBody: { message: "organizationId is required in query or request body." }
            };
        }

        if (!isFieldSettingsArray(settings)) {
            return {
                status: 400,
                jsonBody: { message: "'settings' must be a valid FieldSetting[] array." }
            };
        }

        const now = new Date().toISOString();
        const settingsDocument = {
            id: `settings-${organizationId}`,
            organizationId,
            entityType: "settings",
            fields: settings,
            updatedAt: now
        };

        const saved = await getTasksContainer().items.upsert(settingsDocument);
        return { status: 200, jsonBody: saved.resource };
    } catch (error) {
        context.error("SaveSettings failed", error);
        return {
            status: 500,
            jsonBody: { message: "Failed to save settings.", error: (error as Error).message }
        };
    }
}

app.http("SaveSettings", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "settings",
    handler: SaveSettings
});