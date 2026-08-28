import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { resolveOrganizationId, success, withErrorHandling } from '../http/http';
import { getTaskService } from '../services/serviceFactory';
import { parseTaskListQuery } from '../validation/taskValidation';

export const GetTasks = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const organizationId = resolveOrganizationId(request);
    const query = parseTaskListQuery(request.query, organizationId);
    const page = await getTaskService().list(query);
    return success(page);
  },
);

app.http('GetTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: GetTasks,
});
