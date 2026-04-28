import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { getDefaultCosmosClient } from "../cosmos.util";
import {
  ETaskStatus,
  ITaskDBStruct,
  ITaskPostData,
} from "../interfaces/Task.interface";
import { createResponse, HttpError, response500 } from "../libs/http";

function validateTaskPostData(d: any): d is ITaskPostData {
  if (!d?.name || typeof d.name !== "string" || d.name.trim() === "") {
    throw new HttpError(
      "Task Name must be provided and must be a non-empty string",
      400
    );
  }

  if (d?.status !== undefined && d?.status !== null) {
    if (typeof d.status !== "number") {
      throw new HttpError("Status must be a number", 400);
    }
    if (!(d.status >= 0 && d.status <= 3)) {
      throw new HttpError(
        "Invalid Task Status. Must be between 0-3 (0: NOT_STARTED, 1: IN_PROGRESS, 2: COMPLETED, 3: CANCELLED)",
        400
      );
    }
  }

  if (d?.description !== undefined && typeof d.description !== "string") {
    throw new HttpError("Description must be a string if provided", 400);
  }

  return true;
}

export async function InsertTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    if (!validateTaskPostData(body)) return;

    // Get organizationId from query parameter (or use default)
    // NOTE: This should ideally come from authenticated user context
    const organizationId = request.query.get("organizationId");
    if (!organizationId) {
      throw new HttpError("Organization ID is required", 400);
    }

    // list of allowed props for task creation
    const allowedProps = ["name", "description", "status"];

    const toInsert: ITaskDBStruct = {
      organizationId: parseInt(organizationId, 10),
      name: body.name.trim(),
      status:
        body.status !== undefined ? body.status : ETaskStatus.NOT_STARTED,
      description: body.description?.trim() || "",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    // Add any custom properties that are provided
    for (const key in body) {
      if (
        !allowedProps.includes(key) &&
        key !== "organizationId" &&
        key !== "isDeleted"
      ) {
        toInsert[key] = body[key];
      }
    }

    const client = getDefaultCosmosClient();
    const createdTask = await client
      .database("TaskApp")
      .container("Tasks")
      .items.create(toInsert);

    return createResponse(createdTask.resource, 201);
  } catch (e) {
    if (e instanceof HttpError) {
      return e.createResponse();
    }
    return response500("InsertTask", e);
  }
}

app.http("InsertTask", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: InsertTask,
});

// query params: organizationId (required)
// body: { name: string, description?: string, status?: number }
