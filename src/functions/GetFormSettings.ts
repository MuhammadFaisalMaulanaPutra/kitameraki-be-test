import { app, HttpRequest } from '@azure/functions';
import { ok } from '../http/respond';
import { withErrorHandling } from '../http/withErrorHandling';
import { organizationQuerySchema } from '../schemas/task';
import { getFormSettings } from '../repositories/formSettingsRepository';
import { DEFAULT_FORM_FIELDS } from '../domain/formFields';

/**
 * GET /api/form-settings?organizationId=… — returns the org's form config, or
 * the default base-field layout when none has been saved yet, so the client
 * always has a usable form to render.
 */
export const getFormSettingsHandler = withErrorHandling(async (request: HttpRequest) => {
  const { organizationId } = organizationQuerySchema.parse(Object.fromEntries(request.query.entries()));

  const settings = await getFormSettings(organizationId);
  return ok(settings ?? { organizationId, fields: DEFAULT_FORM_FIELDS, updatedAt: null });
});

app.http('GetFormSettings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'form-settings',
  handler: getFormSettingsHandler,
});
