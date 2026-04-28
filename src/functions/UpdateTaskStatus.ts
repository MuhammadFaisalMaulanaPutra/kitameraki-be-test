import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { HTTP_STATUS } from "../constants";
import { updateTaskStatus as updateTaskStatusService } from "../services/taskService";
import {
  validateOrganizationId,
  validateTaskId,
} from "../validators/parametersValidator";
import { validateTaskStatus } from "../validators/taskValidator";
import {
  AppError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * UpdateTaskStatus function - Updates only the status of a task
 * Query parameters:
 *   - organizationId (required): Organization ID
 *   - id (required): Task ID
 * Body:
 *   - status (required): New status (0: NOT_STARTED, 1: IN_PROGRESS, 2: COMPLETED, 3: CANCELLED)
 */
export async function UpdateTaskStatus(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("UpdateTaskStatus");

  try {
    logger.info("Processing UpdateTaskStatus request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );
    const taskId = validateTaskId(request.query.get("id"));

    // Parse and validate request body
    const body = (await request.json()) as any;

    if (!body || body.status === undefined || body.status === null) {
      throw new Error("Status must be provided");
    }

    validateTaskStatus(body.status);

    // Update task status in database
    const client = getDefaultCosmosClient();
    const updatedTask = await updateTaskStatusService(
      client,
      taskId,
      organizationId,
      body.status
    );

    logger.info("Task status updated successfully", {
      taskId,
      newStatus: body.status,
    });

    const response = createSuccessResponse(updatedTask, HTTP_STATUS.OK);
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

app.http("UpdateTaskStatus", {
  methods: ["POST"],
  authLevel: "function",
  handler: UpdateTaskStatus,
});
