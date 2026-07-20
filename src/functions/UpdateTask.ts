import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandler } from "../middleware/errorHandler";
import { validateBody, validateQueryParams } from "../middleware/validateRequest";
import { TaskIdParamsSchema, UpdateTaskSchema } from "../models/task.model";
import { TaskService } from "../services/task.service";

const UpdateTask = withErrorHandler(
  async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log(`Http function processed request for url "${request.url}"`);

    // Validasi query params (id + organizationId)
    const { id, organizationId } = validateQueryParams(request, TaskIdParamsSchema);

    // Validasi body — hanya field yang diizinkan, minimal 1 field
    const fields = await validateBody(request, UpdateTaskSchema);

    const updatedTask = await TaskService.updateTask(id, organizationId, fields);

    return { jsonBody: updatedTask, status: 200 };
  }
);

app.http('UpdateTask', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  handler: UpdateTask,
});
