import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandler } from "../middleware/errorHandler";
import { validateQueryParams } from "../middleware/validateRequest";
import { TaskIdParamsSchema } from "../models/task.model";
import { TaskService } from "../services/task.service";

const GetTask = withErrorHandler(
  async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log(`Http function processed request for url "${request.url}"`);

    const { id, organizationId } = validateQueryParams(request, TaskIdParamsSchema);
    const task = await TaskService.getTaskById(id, organizationId);

    if (!task) {
      return { status: 404, jsonBody: { error: "Task not found" } };
    }

    return { jsonBody: task, status: 200 };
  }
);

app.http('GetTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetTask,
});
