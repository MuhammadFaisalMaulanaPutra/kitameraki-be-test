import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandling } from "../middleware/errorHandler";
import { requireUuidQueryParam } from "../utils/requestHelpers";
import * as formSettingsService from "../services/formSettingsService";

async function getFormSettingsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    // TODO: once real authentication is in place, derive organizationId
    // from the authenticated caller's context instead of trusting a
    // client-supplied query parameter.
    const organizationId = requireUuidQueryParam(request, 'organizationId');

    const settings = await formSettingsService.getFormSettings(organizationId);

    return { jsonBody: settings, status: 200 };
}

export const GetFormSettings = withErrorHandling(getFormSettingsHandler);

app.http('GetFormSettings', {
    route: 'form-settings',
    methods: ['GET'],
    authLevel: 'function',
    handler: GetFormSettings
});
