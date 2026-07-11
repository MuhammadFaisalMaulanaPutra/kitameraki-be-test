import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTasksContainer } from '../../config/database';
import { CONSTANTS } from '../../config/constants';
import { successResponse, notFoundResponse, errorResponse } from '../../utils/response';
import { withErrorHandling } from '../../middleware/errorHandler';
import { UpdateTaskPayload } from '../../types/task';

const updateTaskHandler = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> => {
  context.log(`UpdateTask: Processing request for url "${request.url}"`);

  const taskId = request.query.get('id');
  const organizationId = request.query.get('organizationId') || CONSTANTS.DEFAULT_ORG_ID;

  if (!taskId) {
    context.log('UpdateTask: Task ID is missing from query parameters');
    return errorResponse('Task ID is required. Pass it as ?id=xxx in the URL.', 400);
  }

  context.log(`UpdateTask: Updating task with ID="${taskId}", org="${organizationId}"`);

  let body: UpdateTaskPayload;
  try {
    body = (await request.json()) as UpdateTaskPayload;
  } catch (err) {
    context.log('UpdateTask: Failed to parse request body as JSON');
    return errorResponse('Invalid JSON in request body', 400);
  }

  const container = await getTasksContainer();

  let existingTask;
  try {
    const result = await container.item(taskId, organizationId).read();
    existingTask = result.resource;
  } catch (err: any) {
    if (err.code === 404) {
      context.log(`UpdateTask: Task with ID="${taskId}" not found in database`);
      return notFoundResponse('Task');
    }
    context.log(`UpdateTask: Database read error - ${err.message}`);
    throw err;
  }

  if (!existingTask) {
    context.log(`UpdateTask: Task with ID="${taskId}" not found (resource is null)`);
    return notFoundResponse('Task');
  }

  const patchOperations = Object.entries(body)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      op: 'replace' as const,
      path: `/${key}`,
      value,
    }));

  if (patchOperations.length === 0) {
    context.log('UpdateTask: No fields to update in request body');
    return errorResponse('No fields to update', 400);
  }

  context.log(`UpdateTask: Applying ${patchOperations.length} patch operations: ${JSON.stringify(patchOperations)}`);

  const { resource: updatedTask } = await container
    .item(taskId, organizationId)
    .patch(patchOperations);

  context.log(`UpdateTask: Task updated successfully - ID="${taskId}"`);
  return successResponse(updatedTask);
};

export const UpdateTask = withErrorHandling(updateTaskHandler);

app.http('UpdateTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: UpdateTask,
});
