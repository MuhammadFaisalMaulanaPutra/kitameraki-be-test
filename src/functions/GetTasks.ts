import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandler } from "../middleware/errorHandler";
import { validateQueryParams } from "../middleware/validateRequest";
import { OrganizationIdParamSchema } from "../models/task.model";
import { TaskService } from "../services/task.service";

const GetTasks = withErrorHandler(
  async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log(`Http function processed request for url "${request.url}"`);

    const { organizationId } = validateQueryParams(request, OrganizationIdParamSchema);

    // Menggunakan parameterized query di service layer (fix SQL injection)
    const tasks = await TaskService.getTasksByOrganization(organizationId);

    return { jsonBody: tasks, status: 200 };
  }
);

app.http('GetTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetTasks,
});
