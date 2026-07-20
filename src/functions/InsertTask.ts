import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandler } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validateRequest";
import { CreateTaskSchema } from "../models/task.model";
import { TaskService } from "../services/task.service";

const InsertTask = withErrorHandler(
  async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log(`Http function processed request for url "${request.url}"`);

    // Validasi body — reject field yang tidak dikenali, enforce constraints
    const data = await validateBody(request, CreateTaskSchema);

    // ID di-generate otomatis di server
    const task = await TaskService.createTask(data);

    return { jsonBody: task, status: 201 };
  }
);

app.http('InsertTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: InsertTask,
});
