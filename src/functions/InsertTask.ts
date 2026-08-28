import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { readJsonBody, resolveOrganizationId, success, withErrorHandling } from '../http/http';
import { getTaskService } from '../services/serviceFactory';
import { parseCreateTaskBody } from '../validation/taskValidation';

export const InsertTask = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const body = parseCreateTaskBody(await readJsonBody(request));
    const organizationId = resolveOrganizationId(request, body.organizationId);
    const task = await getTaskService().create(organizationId, body.input);
    return success(task, 201);
  },
);

app.http('InsertTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: InsertTask,
});
