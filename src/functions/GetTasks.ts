import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";
import { IPaginatedResponse, ITaskDBStruct } from "../interfaces/Task.interface";
import { createResponse, HttpError, response500 } from "../libs/http";

export async function GetTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    context.log(`Http function processed request for url "${request.url}"`);
    
    // Get query parameters
    const organizationId = request.query.get("organizationId");
    const pageNumberParam = request.query.get("pageNumber") || "1";
    const pageSizeParam = request.query.get("pageSize") || "10";
    const searchTerm = request.query.get("searchTerm") || "";
    const statusParam = request.query.get("status");
    const sortBy = request.query.get("sortBy") || "createdAt";
    const sortOrder = request.query.get("sortOrder") || "desc";

    // Validate and parse pagination parameters
    const pageNumber = Math.max(1, parseInt(pageNumberParam, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam, 10) || 10)); // Max 100 per page
    const offset = (pageNumber - 1) * pageSize;

    // Validate sort parameters
    const validSortFields = ["createdAt", "updatedAt", "name", "status"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

    // Validate organization ID
    if (!organizationId) {
      throw new HttpError("organizationId is required", 400);
    }

    // Build query with filters
    let whereConditions = [
      `c.organizationId = ${organizationId}`,
      "c.isDeleted = false",
    ];

    // Add status filter if provided
    if (statusParam !== null && statusParam !== "") {
      const statusValue = parseInt(statusParam, 10);
      if (!isNaN(statusValue) && statusValue >= 0 && statusValue <= 3) {
        whereConditions.push(`c.status = ${statusValue}`);
      }
    }

    // Add search filter if provided
    if (searchTerm) {
      const escapedSearchTerm = searchTerm.replace(/'/g, "''");
      whereConditions.push(
        `(CONTAINS(LOWER(c.name), LOWER('${escapedSearchTerm}')) OR CONTAINS(LOWER(c.description), LOWER('${escapedSearchTerm}')))`
      );
    }

    const whereClause = whereConditions.join(" AND ");

    // Count total items matching the filter
    const client = getDefaultCosmosClient();
    const countQuery = `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`;
    const countResult = await client
      .database("TaskApp")
      .container("Tasks")
      .items.query<number>(countQuery)
      .fetchAll();

    const totalCount = countResult.resources[0] || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch paginated and sorted data
    const dataQuery = `SELECT * FROM c WHERE ${whereClause} ORDER BY c.${sortField} ${sortDirection} OFFSET ${offset} LIMIT ${pageSize}`;
    const tasksResult = await client
      .database("TaskApp")
      .container("Tasks")
      .items.query<ITaskDBStruct>(dataQuery)
      .fetchAll();

    const paginatedResponse: IPaginatedResponse<ITaskDBStruct> = {
      items: tasksResult.resources,
      totalCount,
      pageNumber,
      pageSize,
      totalPages,
    };

    return createResponse(paginatedResponse, 200);
  } catch (e) {
    if (e instanceof HttpError) {
      return e.createResponse();
    }
    return response500("GetTasks", e);
  }
}

app.http("GetTasks", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetTasks,
});

// query params: organizationId (required), pageNumber (default: 1), pageSize (default: 10, max: 100), 
// searchTerm (optional), status (optional: 0-3), sortBy (default: createdAt), sortOrder (default: desc)
