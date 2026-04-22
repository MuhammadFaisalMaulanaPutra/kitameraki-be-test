/**
 * @file BulkDeleteTasks.ts
 * @description Azure Function handler for deleting multiple tasks in a single request.
 *
 * Endpoint:  DELETE /api/tasks/bulk
 *
 * Request body:  string[]  — an array of task IDs to delete.
 *
 * Response:  200 OK with a detailed result report indicating which IDs succeeded
 *            and which failed. Using 200 (rather than 204) is intentional because
 *            the response body carries meaningful per-item outcome information.
 *
 * Implementation notes:
 *  - `Promise.allSettled` is used so that a failure on one item does not
 *    prevent the remaining items from being processed.
 *  - The original code swallowed per-item errors by not inspecting the
 *    `allSettled` results. This version reports each outcome individually,
 *    giving the caller full visibility into partial failures.
 *  - A maximum batch size is enforced to prevent resource exhaustion.
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../lib/cosmosClient";
import { badRequest, internalError, ok } from "../utils/responseHelpers";

/** Maximum number of IDs accepted per bulk-delete request. */
const MAX_BULK_DELETE_SIZE = 100;

interface BulkDeleteResult {
  succeeded: string[];
  failed: Array<{ id: string; reason: string }>;
}

export async function BulkDeleteTasks(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // -----------------------------------------------------------------------
    // 1. Parse and validate the request body
    // -----------------------------------------------------------------------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    if (!Array.isArray(body) || body.length === 0) {
      return badRequest("Request body must be a non-empty array of task ID strings.");
    }

    if (body.length > MAX_BULK_DELETE_SIZE) {
      return badRequest(
        `Bulk delete is limited to ${MAX_BULK_DELETE_SIZE} items per request. Received ${body.length}.`
      );
    }

    const ids = body as unknown[];
    for (let i = 0; i < ids.length; i++) {
      if (typeof ids[i] !== "string" || (ids[i] as string).trim().length === 0) {
        return badRequest(`Item at index ${i} must be a non-empty string ID.`);
      }
    }

    const taskIds = ids as string[];

    // -----------------------------------------------------------------------
    // 2. Perform deletions concurrently and collect per-item outcomes
    // -----------------------------------------------------------------------
    const deletePromises = taskIds.map((id) =>
      container.item(id, id).delete()
    );

    const results = await Promise.allSettled(deletePromises);

    const report: BulkDeleteResult = { succeeded: [], failed: [] };

    results.forEach((result, index) => {
      const id = taskIds[index];
      if (result.status === "fulfilled") {
        report.succeeded.push(id);
      } else {
        const reason =
          result.reason?.message ??
          result.reason?.code?.toString() ??
          "Unknown error";
        report.failed.push({ id, reason });
        context.warn(`Bulk delete: failed to delete task id=${id}. Reason: ${reason}`);
      }
    });

    context.log(
      `Bulk delete completed. succeeded=${report.succeeded.length}, failed=${report.failed.length}`
    );

    return ok(report);
  } catch (error) {
    context.error("Unexpected error during bulk delete:", error);
    return internalError("processing the bulk delete request");
  }
}

app.http("BulkDeleteTasks", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "tasks/bulk",
  handler: BulkDeleteTasks,
});
