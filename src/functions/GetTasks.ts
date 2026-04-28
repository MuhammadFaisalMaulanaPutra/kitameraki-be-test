import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { HTTP_STATUS } from "../constants";
import { getTasksList } from "../services/taskService";
import {
  validateOrganizationId,
  validatePaginationParams,
  validateSortParams,
  validateStatusFilter,
  validateSearchTermParam,
} from "../validators/parametersValidator";
import {
  AppError,
  createErrorResponse,
  createSuccessResponse,
  Logger,
} from "../libs/errorHandling";

/**
 * GetTasks function - Retrieves paginated list of tasks with optional filtering and searching
 * Query parameters:
 *   - organizationId (required): Organization ID
 *   - pageNumber (optional, default: 1): Page number
 *   - pageSize (optional, default: 10, max: 100): Items per page
 *   - status (optional): Filter by status (0-3)
 *   - searchTerm (optional): Search in name and description
 *   - sortBy (optional, default: createdAt): Sort field
 *   - sortOrder (optional, default: desc): Sort direction (asc/desc)
 */
export async function GetTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = new Logger("GetTasks");

  try {
    logger.info("Processing GetTasks request");

    // Validate required parameters
    const organizationId = validateOrganizationId(
      request.query.get("organizationId")
    );

    // Validate optional parameters
    const { pageNumber, pageSize, offset } = validatePaginationParams(
      request.query.get("pageNumber") || undefined,
      request.query.get("pageSize") || undefined
    );

    const { sortField, sortDirection } = validateSortParams(
      request.query.get("sortBy") || undefined,
      request.query.get("sortOrder") || undefined
    );

    const statusFilter = validateStatusFilter(request.query.get("status"));
    const searchTerm = validateSearchTermParam(
      request.query.get("searchTerm") || ""
    );

    // Get Cosmos client and fetch data
    const client = getDefaultCosmosClient();
    const paginatedResponse = await getTasksList(
      client,
      organizationId,
      pageNumber,
      pageSize,
      statusFilter || undefined,
      searchTerm || undefined,
      sortField,
      sortDirection
    );

    logger.info("Successfully retrieved tasks", {
      pageNumber,
      pageSize,
      totalCount: paginatedResponse.totalCount,
    });

    const response = createSuccessResponse(paginatedResponse, HTTP_STATUS.OK);
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

app.http("GetTasks", {
  methods: ["GET"],
  authLevel: "function",
  handler: GetTasks,
});
