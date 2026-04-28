import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { HTTP_STATUS } from "../constants";
import { bulkSoftDeleteTasks } from "../services/taskService";
import {
  validateOrganizationId,
  validateTaskIdsArray,
} from "../validators/parametersValidator";
import {
  AppError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * BulkDeleteTasks function - Soft deletes multiple tasks
 * Query parameters:
 *   - organizationId (required): Organization ID
 * Body:
 *   - Array of task IDs to delete
 */
export async function BulkDeleteTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("BulkDeleteTasks");

  try {
    logger.info("Processing BulkDeleteTasks request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );

    // Parse and validate request body
    const body = await request.json();
    const taskIds = validateTaskIdsArray(body);

    logger.info("Deleting tasks", { count: taskIds.length });

    // Delete tasks from database
    const client = getDefaultCosmosClient();
    const deletedCount = await bulkSoftDeleteTasks(
      client,
      taskIds,
      organizationId
    );

    logger.info("Tasks deleted successfully", {
      requestedCount: taskIds.length,
      deletedCount,
    });

    const response = createSuccessResponse(
      {
        message: `Successfully deleted ${deletedCount} of ${taskIds.length} task(s)`,
        deletedCount,
        requestedCount: taskIds.length,
      },
      HTTP_STATUS.OK
    );
    return {
      jsonBody: response,
      status: response.status,
    };
  } catch (e) {
    if (e instanceof AppError) {
      logger.error(e.message, e, { code: e.code });
      const errorResponse = createErrorResponse(e, e.status);
      return {
        jsonBody: errorResponse,
        status: errorResponse.status,
      };
    }

    logger.error("Unexpected error", e as Error);
    const errorResponse = createErrorResponse(
      "Internal Server Error",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return {
      jsonBody: errorResponse,
      status: errorResponse.status,
    };
  }
}

app.http("BulkDeleteTasks", {
  methods: ["DELETE"],
  authLevel: "function",
  handler: BulkDeleteTasks,
});
