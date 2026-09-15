import { app } from '@azure/functions';
import { application } from '@/composition';
import { parseFormSettings } from '@/domain/schemas';
import { readJson, withHttpHandling } from '@/http';

const handler = withHttpHandling(async (request, _context, execution) => {
  const settings = parseFormSettings(
    await readJson(request, application.config.MAX_REQUEST_BODY_BYTES),
  );
  const saved = await application.settingsService.save(
    execution.organizationId!,
    settings,
    request.headers.get('if-match') || undefined,
    execution,
  );
  return {
    status: 200,
    jsonBody: saved,
    headers: saved.etag ? { ETag: saved.etag } : undefined,
  };
}, application.httpRuntime);

app.http('SaveFormSettings', {
  route: 'form-settings',
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler,
});
