import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { fetchTask } from "../services/taskService";
import { NotFoundError } from "../errors/notFoundError"; 
import { errorResponse, successResponse } from "../utils/response";

export async function GetTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const taskId = request.params.id;
    const organizationId = request.params.organizationId;

    if (!taskId || !organizationId) {
      return {
        status: 400,
        jsonBody: {
          message: "taskId and organizationId are required",
        },
      };
    }

    const result = await fetchTask(taskId, organizationId);

    return {
      status: 200,
      jsonBody: successResponse(result, "Task fetched successfully")
    };

  } catch (error: any) {
    console.log("Error fetching task:", error);
    return {
      status: error instanceof NotFoundError ? 404 : 400,
      jsonBody: errorResponse(error.message),
    };
  }
}

app.http("GetTask", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "task/{id}/organization/{organizationId}",
  handler: GetTask,
});