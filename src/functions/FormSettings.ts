import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { formSettingsInputSchema } from "../lib/formSettingsSchema";
import { parseOrThrow, withErrorHandling } from "../lib/http";
import { organizationParamsSchema } from "../lib/taskSchema";
import { getFormSettings, saveFormSettings } from "../services/formSettingsService";

export async function GetFormSettings(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const params = parseOrThrow(organizationParamsSchema, {
        organizationId: request.query.get("organizationId")
    });
    const settings = await getFormSettings(params.organizationId);
    return { jsonBody: settings, status: 200 };
}

export async function PutFormSettings(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const params = parseOrThrow(organizationParamsSchema, {
        organizationId: request.query.get("organizationId")
    });
    const input = parseOrThrow(formSettingsInputSchema, await request.json());
    const settings = await saveFormSettings(params.organizationId, input);
    return { jsonBody: settings, status: 200 };
}

app.http("GetFormSettings", {
    methods: ["GET"],
    route: "form-settings",
    authLevel: "anonymous",
    handler: withErrorHandling(GetFormSettings)
});

app.http("PutFormSettings", {
    methods: ["PUT"],
    route: "form-settings",
    authLevel: "anonymous",
    handler: withErrorHandling(PutFormSettings)
});
