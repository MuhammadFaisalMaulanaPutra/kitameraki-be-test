import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandler } from "../middleware/errorHandler";
import { validateBody, validateQueryParams } from "../middleware/validateRequest";
import { BulkDeleteSchema, OrganizationIdParamSchema } from "../models/task.model";
import { TaskService } from "../services/task.service";

const BulkDeleteTasks = withErrorHandler(
  async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log(`Http function processed request for url "${request.url}"`);

    const { organizationId } = validateQueryParams(request, OrganizationIdParamSchema);

    // Validasi body — array of UUID strings, min 1, max 100
    const taskIds = await validateBody(request, BulkDeleteSchema);

    // Promise.all — menunggu semua delete selesai sebelum return
    // (fix dari bug forEach async sebelumnya)
    await TaskService.bulkDeleteTasks(taskIds, organizationId);

    return {
      status: 200,
      jsonBody: { message: `${taskIds.length} task(s) deleted successfully` },
    };
  }
);

app.http('BulkDeleteTasks', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: BulkDeleteTasks,
});
