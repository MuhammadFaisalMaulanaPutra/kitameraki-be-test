import { app, HttpRequest } from '@azure/functions';
import { noContent } from '../http/respond';
import { withErrorHandling } from '../http/withErrorHandling';
import { bulkDeleteSchema, organizationQuerySchema } from '../schemas/task';
import { bulkDeleteTasks } from '../repositories/taskRepository';

/**
 * POST /api/tasks/bulk-delete?organizationId=… — body: { ids: string[] }.
 * POST (not DELETE) because request bodies on DELETE are unreliable across
 * proxies/fetch. Waits for every delete to finish before responding.
 */
export const bulkDelete = withErrorHandling(async (request: HttpRequest) => {
  const { organizationId } = organizationQuerySchema.parse(Object.fromEntries(request.query.entries()));
  const { ids } = bulkDeleteSchema.parse(await request.json());

  await bulkDeleteTasks(ids, organizationId);
  return noContent();
});

app.http('BulkDeleteTasks', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks/bulk-delete',
  handler: bulkDelete,
});
