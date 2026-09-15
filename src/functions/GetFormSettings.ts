import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { getFormSettings } from "../services/formSettingsService";

export async function GetFormSettings(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get("organizationId");

        if (!organizationId) {
            return {
                status: 400,
                jsonBody: {
                    message: "organizationId is required",
                },
            };
        }

        const settings = await getFormSettings(organizationId);

        if (!settings) {
            return {
                status: 404,
                jsonBody: {
                    message: "Form settings not found",
                },
            };
        }

        return {
            status: 200,
            jsonBody: settings,
        };
    } catch (error) {
        context.error("Failed to get form settings", error);

        return {
            status: 500,
            jsonBody: {
                message: "Failed to retrieve form settings",
            },
        };
    }
}

app.http("GetFormSettings", {
    methods: ["GET"],
    authLevel: "anonymous",
    handler: GetFormSettings,
});