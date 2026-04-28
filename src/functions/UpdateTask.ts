import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { createResponse, HttpError, response500 } from "../libs/http";

export async function UpdateTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const taskId = request.query.get("id");
    const organizationId = request.query.get("organizationId");

    if (!taskId) {
      throw new HttpError("Task ID is required", 400);
    }

    if (!organizationId) {
      throw new HttpError("Organization ID is required", 400);
    }

    const body = (await request.json()) as object;

    if (!body || Object.keys(body).length === 0) {
      throw new HttpError("Request body must contain at least one field to update", 400);
    }

    // Prevent certain fields from being updated directly
    const protectedFields = ["organizationId", "id", "createdAt", "isDeleted"];
    const patchRequests = [];

    for (let key in body) {
      if (!protectedFields.includes(key)) {
        patchRequests.push({
          op: "replace" as const,
          path: `/${key}`,
          value: body[key],
        });
      }
    }

    // Always update the updatedAt timestamp
    patchRequests.push({
      op: "replace" as const,
      path: "/updatedAt",
      value: new Date(),
    });

    if (patchRequests.length === 0) {
      throw new HttpError(
        "No valid fields to update (protected fields: organizationId, id, createdAt, isDeleted)",
        400
      );
    }

    const client = getDefaultCosmosClient();
    const updatedTask = await client
      .database("TaskApp")
      .container("Tasks")
      .item(taskId, organizationId)
      .patch(patchRequests);

    return createResponse(updatedTask.resource, 200);
  } catch (e) {
    if (e instanceof HttpError) {
      return e.createResponse();
    }
    return response500("UpdateTask", e);
  }
}

app.http("UpdateTask", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: UpdateTask,
});

// query params: organizationId (required), id (required)
// body: object of key-value pairs to update (name, description, status, etc.)
// protected fields: organizationId, id, createdAt, isDeleted
