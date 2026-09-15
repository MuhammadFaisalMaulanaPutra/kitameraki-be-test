import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getFormSettingsContainer } from "../cosmos/client";
import { toErrorResponse } from "../http/errors";
import { badRequest, ok } from "../http/responses";
import { isValidUuid } from "../validation/task";
import { defaultFormSettings } from "../models/formSettings";

export async function GetFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const organizationId = request.query.get('organizationId');
    if (!isValidUuid(organizationId)) {
        return badRequest("Query parameter 'organizationId' must be a valid UUID");
    }

    try {
        const container = await getFormSettingsContainer();
        const { resource } = await container.item(organizationId, organizationId).read();
        return ok(resource ?? defaultFormSettings(organizationId));
    } catch (error) {
        const cosmosError = error as { code?: number };
        if (cosmosError?.code === 404) {
            return ok(defaultFormSettings(organizationId));
        }
        return toErrorResponse(error, context);
    }
}

app.http('GetFormSettings', {
    route: 'form-settings',
    methods: ['GET'],
    authLevel: 'function',
    handler: GetFormSettings
});
