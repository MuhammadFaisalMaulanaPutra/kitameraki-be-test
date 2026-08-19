import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandling } from "../middleware/errorHandler";
import { requireUuidQueryParam } from "../utils/requestHelpers";
import * as formSettingsService from "../services/formSettingsService";
import { UpdateFormSettingsInput } from "../models/formSettings.types";
import { BadRequestError } from "../utils/errors";

async function updateFormSettingsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    // TODO: once real authentication is in place, derive organizationId
    // from the authenticated caller's context instead of trusting a
    // client-supplied query parameter.
    const organizationId = requireUuidQueryParam(request, 'organizationId');

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new BadRequestError('Request body must be valid JSON.');
    }

    const updatedSettings = await formSettingsService.updateFormSettings(
        organizationId,
        body as UpdateFormSettingsInput
    );

    return { jsonBody: updatedSettings, status: 200 };
}

export const UpdateFormSettings = withErrorHandling(updateFormSettingsHandler);

// PUT (not PATCH): form settings are owned wholesale by the client —
// every save replaces the full field configuration, which PUT
// communicates correctly per REST conventions.
app.http('UpdateFormSettings', {
    route: 'form-settings',
    methods: ['PUT'],
    authLevel: 'function',
    handler: UpdateFormSettings
});
