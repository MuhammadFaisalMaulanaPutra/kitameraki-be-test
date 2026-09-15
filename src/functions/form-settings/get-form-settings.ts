import { app } from '@azure/functions';
import { application } from '@/composition';
import { withHttpHandling } from '@/http';

const handler = withHttpHandling(async (_request, _context, execution) => {
  const settings = await application.settingsService.get(execution.organizationId!, execution);
  return {
    status: 200,
    jsonBody: settings,
    headers: settings.etag ? { ETag: settings.etag } : undefined,
  };
}, application.httpRuntime);

app.http('GetFormSettings', {
  route: 'form-settings',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler,
});
