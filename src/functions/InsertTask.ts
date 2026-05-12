import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosClient } from '../libs/cosmosClient';
import { created, errorResponse } from '../libs/response';
import { createTask } from '../services/taskService';
import { parseOrganizationId, validateTaskBody } from '../validators/taskValidator';
import { TaskStatus } from '../interfaces/task';

export async function InsertTask(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const organizationId = parseOrganizationId(request.query.get('organizationId'));
    const body = validateTaskBody(await request.json());

    const now = new Date().toISOString();
    const client = getCosmosClient();
    const task = await createTask(client, {
      ...body,
      name: body.name.trim(),
      organizationId,
      status: body.status ?? TaskStatus.NOT_STARTED,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    return created(task);
  } catch (err) {
    return errorResponse(err);
  }
}

app.http('InsertTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: InsertTask,
});
