import { app } from '@azure/functions';
import { application } from '@/composition';
import { parseListQuery } from '@/domain/schemas';
import { withHttpHandling } from '@/http';

const handler = withHttpHandling(
  async (request, _context, execution) => ({
    status: 200,
    jsonBody: await application.taskService.list(
      execution.organizationId!,
      parseListQuery(request.query),
      execution,
    ),
  }),
  application.httpRuntime,
);

app.http('ListTasks', {
  route: 'tasks',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler,
});
