import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosClient } from '../libs/cosmosClient';
import { ok, errorResponse } from '../libs/response';
import { getFormSettings } from '../services/formSettingsService';
import { parseOrganizationId } from '../validators/taskValidator';

export async function GetFormSettings(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));

    const client = getCosmosClient();
    const settings = await getFormSettings(client, organizationId);
    return ok(settings ?? { organizationId, fields: [] });
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('GetFormSettings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetFormSettings,
});
