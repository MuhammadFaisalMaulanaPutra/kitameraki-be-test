import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandler } from "../middleware/errorHandler";
import { validateQueryParams } from "../middleware/validateRequest";
import { TaskIdParamsSchema } from "../models/task.model";
import { TaskService } from "../services/task.service";

const DeleteTask = withErrorHandler(
  async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log(`Http function processed request for url "${request.url}"`);

    const { id, organizationId } = validateQueryParams(request, TaskIdParamsSchema);

    await TaskService.deleteTask(id, organizationId);

    return { status: 200, jsonBody: { message: "Task deleted successfully" } };
  }
);

app.http('DeleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: DeleteTask,
});
