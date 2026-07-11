import { app, HttpRequest } from '@azure/functions';
import { ok } from '../http/respond';
import { HttpError, withErrorHandling } from '../http/withErrorHandling';
import { organizationQuerySchema } from '../schemas/task';
import { getTask } from '../repositories/taskRepository';

/** GET /api/tasks/{id}?organizationId=… — single task (organizationId = partition key). */
export const getTaskById = withErrorHandling(async (request: HttpRequest) => {
  const { organizationId } = organizationQuerySchema.parse(Object.fromEntries(request.query.entries()));
  const id = request.params.id;

  const task = await getTask(id, organizationId);
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }
  return ok(task);
});

app.http('GetTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: getTaskById,
});
