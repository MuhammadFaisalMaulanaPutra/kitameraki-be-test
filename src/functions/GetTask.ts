import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { HTTP_STATUS } from "../constants";
import { getTaskById } from "../services/taskService";
import {
  validateOrganizationId,
  validateTaskId,
} from "../validators/parametersValidator";
import {
  AppError,
  NotFoundError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * GetTask function - Retrieves a single task by ID
 * Query parameters:
 *   - organizationId (required): Organization ID
 *   - id (required): Task ID
 */
export async function GetTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("GetTask");

  try {
    logger.info("Processing GetTask request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );
    const taskId = validateTaskId(request.query.get("id"));

    // Get task from database
    const client = getDefaultCosmosClient();
    const task = await getTaskById(client, taskId, organizationId);

    if (!task) {
      logger.warn("Task not found", { taskId, organizationId });
      throw new NotFoundError("Task not found");
    }

    logger.info("Successfully retrieved task", { taskId });

    const response = createSuccessResponse(task, HTTP_STATUS.OK);
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

app.http("GetTask", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetTask,
});
