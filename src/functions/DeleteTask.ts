import { app, HttpRequest } from '@azure/functions';
import { noContent } from '../http/respond';
import { withErrorHandling } from '../http/withErrorHandling';
import { organizationQuerySchema } from '../schemas/task';
import { deleteTask } from '../repositories/taskRepository';

/** DELETE /api/tasks/{id}?organizationId=… */
export const deleteTaskById = withErrorHandling(async (request: HttpRequest) => {
  const { organizationId } = organizationQuerySchema.parse(Object.fromEntries(request.query.entries()));
  const id = request.params.id;

  await deleteTask(id, organizationId);
  return noContent();
});

app.http('DeleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: deleteTaskById,
});
