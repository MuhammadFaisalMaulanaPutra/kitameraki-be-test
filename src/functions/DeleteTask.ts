import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosClient } from '../libs/cosmosClient';
import { ok, errorResponse } from '../libs/response';
import { softDeleteTask } from '../services/taskService';
import { parseOrganizationId, parseTaskId } from '../validators/taskValidator';

export async function DeleteTask(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));
    const taskId = parseTaskId(request.query.get('id'));

    const client = getCosmosClient();
    await softDeleteTask(client, taskId, organizationId);
    return ok({ message: 'Task deleted', taskId });
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('DeleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: DeleteTask,
});
