import { app } from '@azure/functions';
import { application } from '@/composition';
import { getTaskId, withHttpHandling } from '@/http';

const handler = withHttpHandling(async (request, _context, execution) => {
  await application.taskService.delete(execution.organizationId!, getTaskId(request), execution);
  return { status: 204 };
}, application.httpRuntime);

app.http('DeleteTask', {
  route: 'tasks/{id}',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler,
});
