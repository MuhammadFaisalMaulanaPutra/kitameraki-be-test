import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTasksContainer } from '../../config/database';
import { CONSTANTS } from '../../config/constants';
import { successResponse, notFoundResponse, errorResponse } from '../../utils/response';
import { withErrorHandling } from '../../middleware/errorHandler';

const deleteTaskHandler = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  context.log(`DeleteTask: Processing request for url "${request.url}"`);

  const taskId = request.query.get('id');
  const organizationId = request.query.get('organizationId') || CONSTANTS.DEFAULT_ORG_ID;

  if (!taskId) {
    context.log('DeleteTask: Task ID is missing from query parameters');
    return errorResponse('Task ID is required. Pass it as ?id=xxx in the URL.', 400);
  }

  context.log(`DeleteTask: Deleting task with ID="${taskId}", org="${organizationId}"`);

  const container = await getTasksContainer();

  let existingTask;
  try {
    const result = await container.item(taskId, organizationId).read();
    existingTask = result.resource;
  } catch (err: any) {
    if (err.code === 404) {
      context.log(`DeleteTask: Task with ID="${taskId}" not found in database`);
      return notFoundResponse('Task');
    }
    context.log(`DeleteTask: Database read error - ${err.message}`);
    throw err;
  }

  if (!existingTask) {
    context.log(`DeleteTask: Task with ID="${taskId}" not found (resource is null)`);
    return notFoundResponse('Task');
  }

  await container.item(taskId, organizationId).delete();

  context.log(`DeleteTask: Task deleted successfully - ID="${taskId}"`);
  return successResponse({ message: 'Task deleted successfully' });
};

export const DeleteTask = withErrorHandling(deleteTaskHandler);

app.http('DeleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: DeleteTask,
});
