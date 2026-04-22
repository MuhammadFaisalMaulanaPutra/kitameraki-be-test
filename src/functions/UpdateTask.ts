import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { UpdateTaskDto } from "../dto/task.dto";
import { patchTask } from "../services/taskService";
import { NotFoundError } from "../errors/notFoundError";
import { errorResponse, successResponse } from "../utils/response";



export async function UpdateTask(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    const taskId = request.params.id;
    const organizationId = request.params.organizationId;

    if (!taskId || !organizationId) {
      return {
        status: 400,
        jsonBody: errorResponse("taskId and organizationId are required"),
      };
    }

    const body = (await request.json()) as UpdateTaskDto;

    const result = await patchTask(taskId, organizationId, body);

    return {
      status: 200,
      jsonBody: successResponse(result, "Task updated successfully"),
    };
    

  } catch (error: any) {
    return {
      status: error instanceof NotFoundError ? 404 : 400,
      jsonBody: errorResponse(error.message),
    };
  }
}

app.http('UpdateTask', {
    methods: ['PATCH'],
    route: 'task/{id}/organization/{organizationId}',
    authLevel: 'anonymous',
    handler: UpdateTask
});
