import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTasksContainer } from '../../config/database';
import { CONSTANTS } from '../../config/constants';
import { successResponse, notFoundResponse, errorResponse } from '../../utils/response';
import { withErrorHandling } from '../../middleware/errorHandler';

const getTaskHandler = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  context.log(`GetTask: Processing request for url "${request.url}"`);

  const taskId = request.query.get('id');
  const organizationId = request.query.get('organizationId') || CONSTANTS.DEFAULT_ORG_ID;

  if (!taskId) {
    return errorResponse('Task ID is required', 400);
  }

  const container = await getTasksContainer();
  const { resource } = await container.item(taskId, organizationId).read();

  if (!resource) {
    return notFoundResponse('Task');
  }

  return successResponse(resource);
};

export const GetTask = withErrorHandling(getTaskHandler);

app.http('GetTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetTask,
});
