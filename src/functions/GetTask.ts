import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { resolveOrganizationId, resolveTaskId, success, withErrorHandling } from '../http/http';
import { getTaskService } from '../services/serviceFactory';

export const GetTask = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const organizationId = resolveOrganizationId(request);
    const taskId = resolveTaskId(request);
    const task = await getTaskService().getById(taskId, organizationId);
    return success(task);
  },
);

app.http('GetTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/{id:guid}',
  handler: GetTask,
});
