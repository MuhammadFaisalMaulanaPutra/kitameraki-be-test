import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { HTTP_STATUS } from "../constants";
import { softDeleteTask } from "../services/taskService";
import {
  validateOrganizationId,
  validateTaskId,
} from "../validators/parametersValidator";
import {
  AppError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * DeleteTask function - Soft deletes a single task
 * Query parameters:
 *   - organizationId (required): Organization ID
 *   - id (required): Task ID
 */
export async function DeleteTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("DeleteTask");

  try {
    logger.info("Processing DeleteTask request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );
    const taskId = validateTaskId(request.query.get("id"));

    // Delete task from database
    const client = getDefaultCosmosClient();
    await softDeleteTask(client, taskId, organizationId);

    logger.info("Task deleted successfully", { taskId });

    const response = createSuccessResponse(
      { message: "Task deleted successfully", taskId },
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

app.http("DeleteTask", {
  methods: ["DELETE"],
  authLevel: "function",
  handler: DeleteTask,
});
