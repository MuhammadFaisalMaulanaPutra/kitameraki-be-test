import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { saveFormSettings } from "../services/formSettingsService";
import type { TaskField } from "../models/TaskField";

export async function SaveFormSettings(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as {
            organizationId?: string;
            fields?: TaskField[];
        };

        if (!body.organizationId) {
            return {
                status: 400,
                jsonBody: {
                    message: "organizationId is required",
                },
            };
        }

        if (!Array.isArray(body.fields)) {
            return {
                status: 400,
                jsonBody: {
                    message: "fields must be an array",
                },
            };
        }

        const settings = await saveFormSettings(
            body.organizationId,
            body.fields
        );

        return {
            status: 200,
            jsonBody: settings,
        };
    } catch (error) {
        context.error("Failed to save form settings", error);

        return {
            status: 500,
            jsonBody: {
                message: "Failed to save form settings",
            },
        };
    }
}

app.http("SaveFormSettings", {
    methods: ["PUT"],
    authLevel: "anonymous",
    route: "form-settings",
    handler: SaveFormSettings,
});