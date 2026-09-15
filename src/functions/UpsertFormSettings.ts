import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getFormSettingsContainer } from "../cosmos/client";
import { toErrorResponse } from "../http/errors";
import { badRequest, ok } from "../http/responses";
import { isValidUuid } from "../validation/task";
import { validateFormSettingsUpdate } from "../validation/formSettings";
import { FormSettings } from "../models/formSettings";

export async function UpsertFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const organizationId = request.query.get('organizationId');
    if (!isValidUuid(organizationId)) {
        return badRequest("Query parameter 'organizationId' must be a valid UUID");
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return badRequest("Request body must be valid JSON");
    }

    const { errors, fields } = validateFormSettingsUpdate(body);
    if (errors.length > 0) {
        return badRequest(errors);
    }

    const settings: FormSettings = { id: organizationId, organizationId, fields: fields! };

    try {
        const container = await getFormSettingsContainer();
        const { resource } = await container.items.upsert(settings);
        return ok(resource);
    } catch (error) {
        return toErrorResponse(error, context);
    }
}

app.http('UpsertFormSettings', {
    route: 'form-settings',
    methods: ['PUT'],
    authLevel: 'function',
    handler: UpsertFormSettings
});
