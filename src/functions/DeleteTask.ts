import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { NotFoundError } from "../errors/notFoundError";
import { deleteTasks } from "../services/taskService";
import { errorResponse, successResponse } from "../utils/response";



export async function DeleteTask(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    const taskId = request.params.id;
    const organizationId = request.params.organizationId;

    if (!taskId || !organizationId) {
      return {
        status: 400,
        jsonBody: errorResponse("taskId and organizationId are required"),
      };
    }

    await deleteTasks(taskId, organizationId);

    return {
      status: 200,
      jsonBody: successResponse(null, "Task deleted successfully")
      };

  } catch (error: any) {
    return {
      status: error instanceof NotFoundError ? 404 : 400,
      jsonBody: errorResponse(error.message),
    };
  }
}

app.http('DeleteTask', {
    methods: ['DELETE'],
    route: 'task/{id}/organization/{organizationId}',
    authLevel: 'anonymous',
    handler: DeleteTask
});
