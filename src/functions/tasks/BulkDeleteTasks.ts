import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTasksContainer } from '../../config/database';
import { CONSTANTS } from '../../config/constants';
import { successResponse, errorResponse } from '../../utils/response';
import { withErrorHandling } from '../../middleware/errorHandler';

const bulkDeleteTasksHandler = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  context.log(`BulkDeleteTasks: Processing request for url "${request.url}"`);

  const body = (await request.json()) as { taskIds: string[] };
  const organizationId = request.query.get('organizationId') || CONSTANTS.DEFAULT_ORG_ID;

  if (!body.taskIds || !Array.isArray(body.taskIds) || body.taskIds.length === 0) {
    return errorResponse('taskIds array is required and must not be empty', 400);
  }

  const container = await getTasksContainer();
  const results: { deleted: number; failed: number } = { deleted: 0, failed: 0 };

  for (const taskId of body.taskIds) {
    try {
      await container.item(taskId, organizationId).delete();
      results.deleted++;
    } catch (error) {
      context.log(`Failed to delete task ${taskId}:`, error);
      results.failed++;
    }
  }

  return successResponse({
    message: `Bulk delete completed: ${results.deleted} deleted, ${results.failed} failed`,
    ...results,
  });
};

export const BulkDeleteTasks = withErrorHandling(bulkDeleteTasksHandler);

app.http('BulkDeleteTasks', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: BulkDeleteTasks,
});
