import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosClient } from '../libs/cosmosClient';
import { ok, errorResponse } from '../libs/response';
import { patchTask } from '../services/taskService';
import { parseOrganizationId, parseTaskId, validateStatusBody } from '../validators/taskValidator';

export async function UpdateTaskStatus(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));
    const taskId = parseTaskId(request.query.get('id'));
    const status = validateStatusBody(await request.json());

    const client = getCosmosClient();
    const task = await patchTask(client, taskId, organizationId, [
      { op: 'replace', path: '/status', value: status },
      { op: 'replace', path: '/updatedAt', value: new Date().toISOString() },
    ]);
    return ok(task);
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('UpdateTaskStatus', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: UpdateTaskStatus,
});
