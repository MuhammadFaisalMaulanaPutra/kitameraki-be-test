import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosClient } from '../libs/cosmosClient';
import { ok, errorResponse } from '../libs/response';
import { bulkSoftDelete } from '../services/taskService';
import { parseOrganizationId, validateTaskIds } from '../validators/taskValidator';

export async function BulkDeleteTasks(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));
    const taskIds = validateTaskIds(await request.json());

    const client = getCosmosClient();
    const result = await bulkSoftDelete(client, taskIds, organizationId);
    return ok(result);
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('BulkDeleteTasks', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: BulkDeleteTasks,
});
