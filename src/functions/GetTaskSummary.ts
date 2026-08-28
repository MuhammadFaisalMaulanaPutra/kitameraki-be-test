import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { resolveOrganizationId, success, withErrorHandling } from '../http/http';
import { getTaskService } from '../services/serviceFactory';

export const GetTaskSummary = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const organizationId = resolveOrganizationId(request);
    const summary = await getTaskService().summary(organizationId);
    return success(summary);
  },
);

app.http('GetTaskSummary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/summary',
  handler: GetTaskSummary,
});
