import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { HTTP_STATUS, PROTECTED_FIELDS } from "../constants";
import { updateTask } from "../services/taskService";
import {
  validateOrganizationId,
  validateTaskId,
} from "../validators/parametersValidator";
import { validateTaskUpdateData } from "../validators/taskValidator";
import {
  AppError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * UpdateTask function - Updates an existing task
 * Query parameters:
 *   - organizationId (required): Organization ID
 *   - id (required): Task ID
 * Body:
 *   - name (optional): Task name
 *   - description (optional): Task description
 *   - status (optional): Task status (0-3)
 *   - Custom fields: Any additional fields to update
 */
export async function UpdateTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("UpdateTask");

  try {
    logger.info("Processing UpdateTask request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );
    const taskId = validateTaskId(request.query.get("id"));

    // Parse and validate request body
    const body = (await request.json()) as any;
    validateTaskUpdateData(body);

    // Build patch operations, excluding protected fields
    const patchRequests: Array<{
      op: "replace" | "add" | "remove" | "set" | "incr";
      path: string;
      value?: any;
    }> = [];

    for (const key in body) {
      if (!(PROTECTED_FIELDS as readonly string[]).includes(key)) {
        patchRequests.push({
          op: "replace" as const,
          path: `/${key}`,
          value: body[key],
        });
      }
    }

    // Always update the updatedAt timestamp
    patchRequests.push({
      op: "replace" as const,
      path: "/updatedAt",
      value: new Date(),
    });

    // Update task in database
    const client = getDefaultCosmosClient();
    const updatedTask = await updateTask(
      client,
      taskId,
      organizationId,
      patchRequests
    );

    logger.info("Task updated successfully", { taskId });

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

app.http("UpdateTask", {
  methods: ["POST"],
  authLevel: "function",
  handler: UpdateTask,
});
