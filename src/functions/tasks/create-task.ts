import { app } from '@azure/functions';
import { application } from '@/composition';
import { parseTaskInput } from '@/domain/schemas';
import { readJson, withHttpHandling } from '@/http';

const handler = withHttpHandling(
  async (request, _context, execution) => ({
    status: 201,
    jsonBody: await application.taskService.create(
      execution.organizationId!,
      parseTaskInput(await readJson(request, application.config.MAX_REQUEST_BODY_BYTES)),
      execution,
    ),
  }),
  application.httpRuntime,
);

app.http('CreateTask', {
  route: 'tasks',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler,
});
