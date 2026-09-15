import { app } from '@azure/functions';
import { application } from '@/composition';
import { parseTaskPatch } from '@/domain/schemas';
import { getTaskId, readJson, withHttpHandling } from '@/http';

const handler = withHttpHandling(
  async (request, _context, execution) => ({
    status: 200,
    jsonBody: await application.taskService.update(
      execution.organizationId!,
      getTaskId(request),
      parseTaskPatch(await readJson(request, application.config.MAX_REQUEST_BODY_BYTES)),
      execution,
    ),
  }),
  application.httpRuntime,
);

app.http('UpdateTask', {
  route: 'tasks/{id}',
  methods: ['PATCH'],
  authLevel: 'anonymous',
  handler,
});
