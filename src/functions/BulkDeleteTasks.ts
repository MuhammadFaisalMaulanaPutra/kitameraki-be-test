import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { createResponse, HttpError, response500 } from "../libs/http";

export async function BulkDeleteTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    context.log(`Http function processed request for url "${request.url}"`);
    const body = (await request.json()) as string[];
    const organizationId = request.query.get("organizationId");

    if (!organizationId) {
      throw new HttpError("Organization ID is required", 400);
    }

    if (!Array.isArray(body) || body.length === 0) {
      throw new HttpError("Task IDs array is required and must not be empty", 400);
    }

    const client = getDefaultCosmosClient();
    
    // Properly await all delete operations
    const deletePromises = body.map((taskId) =>
      client
        .database("TaskApp")
        .container("Tasks")
        .item(taskId, organizationId)
        .delete()
        .catch((e) => {
          context.log(`Failed to delete task ${taskId}: ${e.message}`);
          return null; // Continue with other deletions even if one fails
        })
    );

    await Promise.all(deletePromises);

    return createResponse(
      { message: `Successfully deleted ${body.length} task(s)` },
      200
    );
  } catch (e) {
    if (e instanceof HttpError) {
      return e.createResponse();
    }
    return response500("BulkDeleteTasks", e);
  }
}

app.http("BulkDeleteTasks", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: BulkDeleteTasks,
});

// query param: organizationId (required)
// body: array of task IDs to delete
