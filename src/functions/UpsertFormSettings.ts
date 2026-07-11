import { app, HttpRequest } from '@azure/functions';
import { ok } from '../http/respond';
import { withErrorHandling } from '../http/withErrorHandling';
import { organizationQuerySchema } from '../schemas/task';
import { upsertFormSettingsSchema } from '../schemas/formSettings';
import { upsertFormSettings } from '../repositories/formSettingsRepository';

/**
 * PUT /api/form-settings?organizationId=… — create or replace the org's form
 * config. Idempotent (upsert). The settings apply to all of the org's tasks.
 */
export const upsertFormSettingsHandler = withErrorHandling(async (request: HttpRequest) => {
  const { organizationId } = organizationQuerySchema.parse(Object.fromEntries(request.query.entries()));
  const { fields } = upsertFormSettingsSchema.parse(await request.json());

  const settings = await upsertFormSettings(organizationId, fields);
  return ok(settings);
});

app.http('UpsertFormSettings', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'form-settings',
  handler: upsertFormSettingsHandler,
});
