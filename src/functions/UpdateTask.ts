import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { PatchOperation } from '@azure/cosmos';
import { getCosmosClient } from '../libs/cosmosClient';
import { ok, errorResponse } from '../libs/response';
import { patchTask } from '../services/taskService';
import { parseOrganizationId, parseTaskId, validateUpdateBody } from '../validators/taskValidator';

export async function UpdateTask(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));
    const taskId = parseTaskId(request.query.get('id'));
    const fields = validateUpdateBody(await request.json());

    const ops: PatchOperation[] = [
      ...Object.entries(fields).map(([key, value]) => ({
        op: 'add' as const,
        path: `/${key}`,
        value,
      })),
      { op: 'replace' as const, path: '/updatedAt', value: new Date().toISOString() },
    ];

    const client = getCosmosClient();
    const task = await patchTask(client, taskId, organizationId, ops);
    return ok(task);
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('UpdateTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: UpdateTask,
});
