import { app, HttpRequest } from '@azure/functions';
import { created } from '../http/respond';
import { withErrorHandling } from '../http/withErrorHandling';
import { createTaskSchema, organizationQuerySchema } from '../schemas/task';
import { createTask } from '../repositories/taskRepository';

/**
 * POST /api/tasks?organizationId=… — create a task. The id and organizationId
 * are set server-side; the body is validated so no arbitrary fields are stored.
 */
export const insertTask = withErrorHandling(async (request: HttpRequest) => {
  const { organizationId } = organizationQuerySchema.parse(Object.fromEntries(request.query.entries()));
  const input = createTaskSchema.parse(await request.json());

  const task = await createTask(input, organizationId);
  return created(task);
});

app.http('InsertTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: insertTask,
});
