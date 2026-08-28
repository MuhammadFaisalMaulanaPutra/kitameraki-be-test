import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { resolveOrganizationId, resolveTaskId, successWithoutData, withErrorHandling } from '../http/http';
import { getTaskService } from '../services/serviceFactory';

export const DeleteTask = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const organizationId = resolveOrganizationId(request);
    const taskId = resolveTaskId(request);
    await getTaskService().delete(taskId, organizationId);
    return successWithoutData();
  },
);

app.http('DeleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/{id:guid}',
  handler: DeleteTask,
});
