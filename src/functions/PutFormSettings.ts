import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { readJsonBody, resolveOrganizationId, success, withErrorHandling } from '../http/http';
import { getFormSettingsService } from '../services/serviceFactory';
import { parseFormSettingsBody } from '../validation/formSettingsValidation';

export const PutFormSettings = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const organizationId = resolveOrganizationId(request);
    const fields = parseFormSettingsBody(await readJsonBody(request));
    const settings = await getFormSettingsService().save(organizationId, fields);
    return success(settings);
  },
);

app.http('PutFormSettings', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'form-settings',
  handler: PutFormSettings,
});
