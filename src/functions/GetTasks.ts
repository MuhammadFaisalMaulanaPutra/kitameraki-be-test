import { app, HttpRequest } from '@azure/functions';
import { ok } from '../http/respond';
import { withErrorHandling } from '../http/withErrorHandling';
import { listTasksQuerySchema } from '../schemas/task';
import { listTasks } from '../repositories/taskRepository';

/** GET /api/tasks — paginated, filterable, searchable list scoped to an org. */
export const getTasks = withErrorHandling(async (request: HttpRequest) => {
  const { organizationId, page, pageSize, status, priority, search } = listTasksQuerySchema.parse(
    Object.fromEntries(request.query.entries()),
  );

  const { items, total } = await listTasks({ organizationId, status, priority, search }, page, pageSize);

  return ok({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

app.http('GetTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: getTasks,
});
