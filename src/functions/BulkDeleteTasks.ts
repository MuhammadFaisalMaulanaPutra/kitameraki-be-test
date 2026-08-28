import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { readJsonBody, resolveOrganizationId, success, withErrorHandling } from '../http/http';
import { getTaskService } from '../services/serviceFactory';
import { parseBulkDeleteBody } from '../validation/taskValidation';

export const BulkDeleteTasks = withErrorHandling(
  async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const organizationId = resolveOrganizationId(request);
    const ids = parseBulkDeleteBody(await readJsonBody(request));
    const result = await getTaskService().bulkDelete(ids, organizationId);
    return success(result);
  },
);

app.http('BulkDeleteTasks', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/bulk',
  handler: BulkDeleteTasks,
});
