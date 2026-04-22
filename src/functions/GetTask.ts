/**
 * @file GetTask.ts
 * @description Azure Function handler for retrieving a single task by its ID.
 *
 * Endpoint:  GET /api/tasks/{id}
 *
 * Path parameters:
 *  - id  {string}  The unique identifier of the task (UUID v4).
 *
 * Response:  Task document on success (200), or structured error (400 / 404 / 500).
 *
 * Implementation notes:
 *  - The `id` is used as both the Cosmos DB document id and the partition key,
 *    making point reads (item().read()) the most efficient retrieval strategy —
 *    O(1) rather than a cross-partition query scan.
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../lib/cosmosClient";
import { Task } from "../models/models";
import {
  ok,
  badRequest,
  notFound,
  internalError,
  isCosmosNotFoundError,
} from "../utils/responseHelpers";

export async function GetTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // -----------------------------------------------------------------------
    // 1. Extract and validate the task ID
    // -----------------------------------------------------------------------
    const taskId = request.params.id;

    if (!taskId || taskId.trim().length === 0) {
      return badRequest('"id" path parameter is required.');
    }

    // -----------------------------------------------------------------------
    // 2. Perform a point read — most efficient Cosmos DB retrieval method
    // -----------------------------------------------------------------------
    const { resource } = await container.item(taskId, taskId).read<Task>();

    if (!resource) {
      return notFound("Task", taskId);
    }

    // Guard against accidentally returning the GLOBAL_SETTINGS document
    // if a caller passes "GLOBAL_SETTINGS" as the id.
    if ((resource as any).type === "system_config") {
      return notFound("Task", taskId);
    }

    return ok(resource);
  } catch (error) {
    // Cosmos DB throws a structured error object with a numeric `code` property
    // when a document does not exist — not a plain 404 integer.
    if (isCosmosNotFoundError(error)) {
      return notFound("Task", request.params.id ?? "");
    }

    context.error("Error fetching task:", error);
    return internalError("fetching the task");
  }
}

app.http("GetTask", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "tasks/{id}",
  handler: GetTask,
});
