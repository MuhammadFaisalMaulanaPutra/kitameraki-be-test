/**
 * @file UpdateTask.ts
 * @description Azure Function handler for partially updating an existing task.
 *
 * Endpoint:  PATCH /api/tasks/{id}
 *
 * Path parameters:
 *  - id  {string}  The unique identifier of the task to update.
 *
 * Request body:  UpdateTaskRequest — a partial Task object (JSON).
 *                Fields `id`, `organizationId`, `createdAt`, and `updatedAt`
 *                are explicitly stripped and cannot be changed via this endpoint.
 *
 * Response:  The updated Task document (200) or structured error.
 *
 * Implementation notes:
 *  - PATCH semantics are honoured: only the fields present in the body are
 *    modified; all other fields retain their existing values.
 *  - The Cosmos DB `patch()` API is used, which sends only the changed fields
 *    over the wire — more efficient than a full document replace.
 *  - `updatedAt` is always set server-side on every successful update.
 *  - Immutable fields are stripped before the patch operation to prevent
 *    clients from altering the partition key or audit timestamps.
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { PatchOperation } from "@azure/cosmos";
import { container } from "../lib/cosmosClient";
import {
  notFound,
  badRequest,
  internalError,
  ok,
  isCosmosNotFoundError,
} from "../utils/responseHelpers";
import { validateUpdateTaskRequest } from "../utils/validators";
import { UpdateTaskRequest } from "../models/models";

/**
 * Fields that must never be modified via the PATCH endpoint.
 * Stripping them here provides defence-in-depth even if the validator
 * were ever to be changed.
 */
const IMMUTABLE_FIELDS = new Set(["id", "organizationId", "createdAt", "updatedAt"]);

export async function UpdateTask(
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
    // 2. Parse and validate the request body
    // -----------------------------------------------------------------------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const validationError = validateUpdateTaskRequest(body);
    if (validationError) {
      return badRequest(validationError);
    }

    const requestData = body as Record<string, unknown>;

    // -----------------------------------------------------------------------
    // 3. Build the patch operations, excluding immutable fields
    // -----------------------------------------------------------------------
    const patchOperations: PatchOperation[] = [];

    for (const [key, value] of Object.entries(requestData)) {
      if (IMMUTABLE_FIELDS.has(key)) {
        // Silently skip immutable fields — already validated above.
        continue;
      }
      patchOperations.push({ op: "replace", path: `/${key}`, value });
    }

    // Always update the server-side timestamp.
    patchOperations.push({
      op: "replace",
      path: "/updatedAt",
      value: new Date().toISOString(),
    });

    if (patchOperations.length === 1) {
      // Only the updatedAt patch was queued — the client sent nothing usable.
      return badRequest("Request body must contain at least one mutable field to update.");
    }

    // -----------------------------------------------------------------------
    // 4. Apply patch to the Cosmos DB document
    // -----------------------------------------------------------------------
    const { resource } = await container
      .item(taskId, taskId)
      .patch(patchOperations);

    context.log(`Task updated successfully. id=${taskId}`);
    return ok(resource);
  } catch (error) {
    if (isCosmosNotFoundError(error)) {
      return notFound("Task", request.params.id ?? "");
    }

    context.error("Error updating task:", error);
    return internalError("updating the task");
  }
}

app.http("UpdateTask", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "tasks/{id}",
  handler: UpdateTask,
});
