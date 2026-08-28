import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { readJsonBody, resolveOrganizationId, resolveTaskId, success, withErrorHandling } from '../http/http';
import { getTaskService } from '../services/serviceFactory';
import { parseUpdateTaskBody } from '../validation/taskValidation';

export const UpdateTask = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const organizationId = resolveOrganizationId(request);
    const taskId = resolveTaskId(request);
    const input = parseUpdateTaskBody(await readJsonBody(request));
    const task = await getTaskService().update(taskId, organizationId, input);
    return success(task);
  },
);

app.http('UpdateTask', {
  methods: ['PATCH', 'POST'],
  authLevel: 'anonymous',
  route: 'tasks/{id:guid}',
  handler: UpdateTask,
});
