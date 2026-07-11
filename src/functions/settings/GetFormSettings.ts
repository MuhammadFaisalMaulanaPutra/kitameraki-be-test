import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getFormConfigsContainer } from '../../config/database';
import { CONSTANTS } from '../../config/constants';
import { successResponse, errorResponse } from '../../utils/response';
import { withErrorHandling } from '../../middleware/errorHandler';
import { FormConfig } from '../../types/formConfig';

const defaultFormConfig: FormConfig = {
  id: CONSTANTS.DEFAULT_FORM_CONFIG_ID,
  organizationId: CONSTANTS.DEFAULT_ORG_ID,
  fields: [],
  columnsPerRow: CONSTANTS.DEFAULT_COLUMNS_PER_ROW,
  updatedAt: new Date().toISOString(),
};

const getFormSettingsHandler = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  context.log(`GetFormSettings: Processing request for url "${request.url}"`);

  const organizationId = request.query.get('organizationId') || CONSTANTS.DEFAULT_ORG_ID;
  const formId = request.query.get('formId') || CONSTANTS.DEFAULT_FORM_CONFIG_ID;

  const container = await getFormConfigsContainer();
  const { resource } = await container.item(formId, organizationId).read();

  if (!resource) {
    return successResponse(defaultFormConfig);
  }

  return successResponse(resource);
};

export const GetFormSettings = withErrorHandling(getFormSettingsHandler);

app.http('GetFormSettings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetFormSettings,
});
