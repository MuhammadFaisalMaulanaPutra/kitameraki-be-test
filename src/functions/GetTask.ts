import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { createResponse, HttpError, response500 } from "../libs/http";

export async function GetTask(
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
    const task = await client
      .database("TaskApp")
      .container("Tasks")
      .item(taskId, organizationId)
      .read();

    if (!task.resource) {
      throw new HttpError("Task not found", 404);
    }

    return createResponse(task.resource, 200);
  } catch (e) {
    if (e instanceof HttpError) {
      return e.createResponse();
    }
    return response500("GetTask", e);
  }
}

app.http("GetTask", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetTask,
});

// query params: organizationId (required), id (required)
