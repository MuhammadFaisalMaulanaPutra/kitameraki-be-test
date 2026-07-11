import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTasksContainer } from '../../config/database';
import { CONSTANTS } from '../../config/constants';
import { successResponse, errorResponse } from '../../utils/response';
import { withErrorHandling } from '../../middleware/errorHandler';

const getTasksHandler = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  context.log(`GetTasks: Processing request for url "${request.url}"`);

  const organizationId = request.query.get('organizationId') || CONSTANTS.DEFAULT_ORG_ID;

  const container = await getTasksContainer();
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.organizationId = @orgId',
      parameters: [{ name: '@orgId', value: organizationId }],
    })
    .fetchAll();

  return successResponse(resources);
};

export const GetTasks = withErrorHandling(getTasksHandler);

app.http('GetTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetTasks,
});
