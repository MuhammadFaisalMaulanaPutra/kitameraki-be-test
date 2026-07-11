import { app, HttpRequest } from '@azure/functions';
import { ok } from '../http/respond';
import { HttpError, withErrorHandling } from '../http/withErrorHandling';
import { organizationQuerySchema, updateTaskSchema } from '../schemas/task';
import { updateTask } from '../repositories/taskRepository';

/**
 * PATCH /api/tasks/{id}?organizationId=… — partial update (also used to change
 * status). Only whitelisted fields are patched; id/organizationId cannot be
 * altered by the client.
 */
export const updateTaskById = withErrorHandling(async (request: HttpRequest) => {
  const { organizationId } = organizationQuerySchema.parse(Object.fromEntries(request.query.entries()));
  const id = request.params.id;
  const input = updateTaskSchema.parse(await request.json());

  const task = await updateTask(id, organizationId, input);
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }
  return ok(task);
});

app.http('UpdateTask', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: updateTaskById,
});
