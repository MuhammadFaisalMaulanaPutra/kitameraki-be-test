import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { ETaskStatus, IUpdateTaskStatusData } from "../interfaces/Task.interface";
import { createResponse, HttpError, response500 } from "../libs/http";

function validateStatusUpdate(data: any): data is IUpdateTaskStatusData {
  if (data?.status === undefined || data?.status === null) {
    throw new HttpError("Status must be provided", 400);
  }

  const status = data.status;
  if (typeof status !== "number") {
    throw new HttpError("Status must be a number", 400);
  }

  if (!(status >= 0 && status <= 3)) {
    throw new HttpError(
      `Invalid Task Status. Must be between 0-3 (0: NOT_STARTED, 1: IN_PROGRESS, 2: COMPLETED, 3: CANCELLED)`,
      400
    );
  }

  return true;
}

export async function UpdateTaskStatus(
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

    const body = await request.json();

    if (!validateStatusUpdate(body)) return;

    const patchRequests = [
      {
        op: "replace" as const,
        path: "/status",
        value: body.status,
      },
      {
        op: "replace" as const,
        path: "/updatedAt",
        value: new Date(),
      },
    ];

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
    return response500("UpdateTaskStatus", e);
  }
}

app.http("UpdateTaskStatus", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: UpdateTaskStatus,
});

// query params: organizationId (required), id (required)
// body: { status: number } (0: NOT_STARTED, 1: IN_PROGRESS, 2: COMPLETED, 3: CANCELLED)
