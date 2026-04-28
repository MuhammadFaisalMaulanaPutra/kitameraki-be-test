import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { getDefaultCosmosClient } from "../cosmos.util";
import {
  ALLOWED_TASK_FIELDS,
  HTTP_STATUS,
} from "../constants";
import {
  ETaskStatus,
  ITaskDBStruct,
} from "../interfaces/Task.interface";
import { createTask } from "../services/taskService";
import { validateOrganizationId } from "../validators/parametersValidator";
import { validateTaskPostData } from "../validators/taskValidator";
import {
  AppError,
  ValidationError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * InsertTask function - Creates a new task
 * Query parameters:
 *   - organizationId (required): Organization ID
 * Body:
 *   - name (required): Task name
 *   - description (optional): Task description
 *   - status (optional, default: 0): Task status (0-3)
 */
export async function InsertTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("InsertTask");

  try {
    logger.info("Processing InsertTask request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );

    // Parse and validate request body
    const body = (await request.json()) as any;
    validateTaskPostData(body);

    // Build task object with allowed properties only
    const toInsert: ITaskDBStruct = {
      organizationId,
      name: body.name.trim(),
      status: body.status !== undefined ? body.status : ETaskStatus.NOT_STARTED,
      description: body.description?.trim() || "",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    // Add custom properties that aren't protected
    for (const key in body) {
      if (!(ALLOWED_TASK_FIELDS as readonly string[]).includes(key)) {
        if (key !== "organizationId" && key !== "isDeleted") {
          toInsert[key] = body[key];
        }
      }
    }

    // Create task in database
    const client = getDefaultCosmosClient();
    const createdTask = await createTask(client, toInsert);

    logger.info("Task created successfully", { taskId: createdTask.id });

    const response = createSuccessResponse(createdTask, HTTP_STATUS.CREATED);
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

    if (e instanceof Error && e.message.includes("Task")) {
      logger.error(e.message, e);
      const errorResponse = createErrorResponse(
        new ValidationError(e.message),
        HTTP_STATUS.BAD_REQUEST
      );
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

app.http("InsertTask", {
  methods: ["POST"],
  authLevel: "function",
  handler: InsertTask,
});
