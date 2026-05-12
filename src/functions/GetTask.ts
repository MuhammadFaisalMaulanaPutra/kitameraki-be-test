import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosClient } from '../libs/cosmosClient';
import { ok, errorResponse, NotFoundError } from '../libs/response';
import { getTaskById } from '../services/taskService';
import { parseOrganizationId, parseTaskId } from '../validators/taskValidator';

export async function GetTask(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));
    const taskId = parseTaskId(request.query.get('id'));

    const client = getCosmosClient();
    const task = await getTaskById(client, taskId, organizationId);
    if (!task) throw new NotFoundError('Task not found');
    return ok(task);
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('GetTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetTask,
});
