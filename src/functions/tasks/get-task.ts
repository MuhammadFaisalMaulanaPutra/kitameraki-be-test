import { app } from '@azure/functions';
import { application } from '@/composition';
import { getTaskId, withHttpHandling } from '@/http';

const handler = withHttpHandling(
  async (request, _context, execution) => ({
    status: 200,
    jsonBody: await application.taskService.get(
      execution.organizationId!,
      getTaskId(request),
      execution,
    ),
  }),
  application.httpRuntime,
);

app.http('GetTask', {
  route: 'tasks/{id}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler,
});
