/**
 * @file DeleteTask.ts
 * @description Azure Function handler for deleting a single task by its ID.
 *
 * Endpoint:  DELETE /api/tasks/{id}
 *
 * Path parameters:
 *  - id  {string}  The unique identifier of the task to delete.
 *
 * Response:  204 No Content on success, or structured error (400 / 404 / 500).
 *
 * Implementation notes:
 *  - A 204 No Content response is used on success, which is the correct REST
 *    semantic for a DELETE operation that leaves no meaningful body to return.
 *  - The `isCosmosNotFoundError` helper correctly inspects the error object's
 *    `code` property (a number), fixing the original bug where the code
 *    compared `error === 404` (which would always evaluate to false because
 *    the SDK throws an object, not a primitive integer).
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../lib/cosmosClient";
import {
  noContent,
  badRequest,
  notFound,
  internalError,
  isCosmosNotFoundError,
} from "../utils/responseHelpers";

export async function DeleteTask(
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
    // 2. Delete the document from Cosmos DB
    //    The partition key equals the document id by design.
    // -----------------------------------------------------------------------
    await container.item(taskId, taskId).delete();

    context.log(`Task deleted successfully. id=${taskId}`);
    return noContent();
  } catch (error) {
    if (isCosmosNotFoundError(error)) {
      return notFound("Task", request.params.id ?? "");
    }

    context.error("Error deleting task:", error);
    return internalError("deleting the task");
  }
}

app.http("DeleteTask", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "tasks/{id}",
  handler: DeleteTask,
});
