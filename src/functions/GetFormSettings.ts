import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { resolveOrganizationId, success, withErrorHandling } from '../http/http';
import { getFormSettingsService } from '../services/serviceFactory';

export const GetFormSettings = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const organizationId = resolveOrganizationId(request);
    const settings = await getFormSettingsService().get(organizationId);
    return success(settings);
  },
);

app.http('GetFormSettings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'form-settings',
  handler: GetFormSettings,
});
