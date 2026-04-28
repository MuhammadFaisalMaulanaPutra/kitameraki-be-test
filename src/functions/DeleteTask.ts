import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { createResponse, HttpError, response500 } from "../libs/http";

export async function DeleteTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    context.log(`Http function processed request for url "${request.url}"`);

    const taskId = request.query.get("id");
    const organizationId = request.query.get("organizationId");

    if (!taskId) {
      throw new HttpError("Task ID is required", 400);
    }

    if (!organizationId) {
      throw new HttpError("Organization ID is required", 400);
    }

    const client = getDefaultCosmosClient();
    await client
      .database("TaskApp")
      .container("Tasks")
      .item(taskId, organizationId)
      .delete();

    return createResponse({ message: "Task deleted successfully" }, 200);
  } catch (e) {
    if (e instanceof HttpError) {
      return e.createResponse();
    }
    return response500("DeleteTask", e);
  }
}

app.http("DeleteTask", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: DeleteTask,
});

// query params: organizationId (required), id (required)
