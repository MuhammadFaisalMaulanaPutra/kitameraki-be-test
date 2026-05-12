import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosClient } from '../libs/cosmosClient';
import { ok, errorResponse } from '../libs/response';
import { upsertFormSettings } from '../services/formSettingsService';
import { parseOrganizationId } from '../validators/taskValidator';
import { validateFormSettingsBody } from '../validators/formSettingsValidator';

export async function UpsertFormSettings(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));
    const { fields } = validateFormSettingsBody(await request.json());

    const client = getCosmosClient();
    const settings = await upsertFormSettings(client, {
      organizationId,
      fields,
      updatedAt: new Date().toISOString(),
    });
    return ok(settings);
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('UpsertFormSettings', {
  methods: ['POST', 'PUT'],
  authLevel: 'anonymous',
  handler: UpsertFormSettings,
});
