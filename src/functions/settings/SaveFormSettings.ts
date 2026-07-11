import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getFormConfigsContainer } from '../../config/database';
import { CONSTANTS } from '../../config/constants';
import { successResponse, errorResponse } from '../../utils/response';
import { withErrorHandling } from '../../middleware/errorHandler';
import { SaveFormConfigPayload, FormConfig } from '../../types/formConfig';

const saveFormSettingsHandler = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  context.log(`SaveFormSettings: Processing request for url "${request.url}"`);

  const body = (await request.json()) as SaveFormConfigPayload;
  const organizationId = request.query.get('organizationId') || CONSTANTS.DEFAULT_ORG_ID;
  const formId = request.query.get('formId') || CONSTANTS.DEFAULT_FORM_CONFIG_ID;

  if (!body.fields || !Array.isArray(body.fields)) {
    return errorResponse('fields array is required', 400);
  }

  const container = await getFormConfigsContainer();

  const formConfig: FormConfig = {
    id: formId,
    organizationId,
    fields: body.fields,
    columnsPerRow: body.columnsPerRow || CONSTANTS.DEFAULT_COLUMNS_PER_ROW,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await container.items.upsert(formConfig);

  return successResponse(resource, 200);
};

export const SaveFormSettings = withErrorHandling(saveFormSettingsHandler);

app.http('SaveFormSettings', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: SaveFormSettings,
});
