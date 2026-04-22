/**
 * @file GetTasks.ts
 * @description Azure Function handler for retrieving a paginated, filterable,
 * and searchable list of tasks.
 *
 * Endpoint:  GET /api/GetTasks
 *
 * Query parameters:
 *  - page         {number}  Page number (1-based). Default: 1.
 *  - pageSize     {number}  Items per page (1–100). Default: 20.
 *  - status       {string}  Filter by task status (todo | in-progress | completed).
 *  - priority     {string}  Filter by priority (low | medium | high).
 *  - organizationId {string} Filter by organisation.
 *  - search       {string}  Full-text search against title and description.
 *  - tags         {string}  Comma-separated list of tags to match (ANY match).
 *
 * Response: PaginatedResponse<Task>
 *
 * Implementation notes:
 *  - Parameterised queries prevent SQL injection in all user-supplied filter values.
 *  - An offset/limit strategy (OFFSET … LIMIT …) is used for simplicity.
 *    For very large datasets, cursor-based pagination via Cosmos continuation
 *    tokens would be preferable — the groundwork is laid in PaginatedResponse.
 *  - Items whose `type` field equals "system_config" are explicitly excluded so
 *    the GLOBAL_SETTINGS document does not appear in task listings.
 */

import { SqlQuerySpec, SqlParameter } from "@azure/cosmos";
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../lib/cosmosClient";
import { Task, PaginatedResponse } from "../models/models";
import { ok, internalError } from "../utils/responseHelpers";
import { parsePositiveInt } from "../utils/validators";

// Maximum allowed page size to prevent runaway memory usage.
const MAX_PAGE_SIZE = 100;

export async function GetTasks(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // -----------------------------------------------------------------------
    // 1. Parse and normalise query parameters
    // -----------------------------------------------------------------------
    const page = parsePositiveInt(request.query.get("page"), 1);
    const pageSize = Math.min(
      parsePositiveInt(request.query.get("pageSize"), 20),
      MAX_PAGE_SIZE
    );
    const offset = (page - 1) * pageSize;

    const organizationId = request.query.get("organizationId");
    const status = request.query.get("status");
    const priority = request.query.get("priority");
    const search = request.query.get("search")?.trim();
    const tagsParam = request.query.get("tags");
    const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // -----------------------------------------------------------------------
    // 2. Build parameterised WHERE clauses
    // -----------------------------------------------------------------------
    const conditions: string[] = [
      // Exclude the GLOBAL_SETTINGS system document from task results.
      "(NOT IS_DEFINED(c.type) OR c.type != 'system_config')",
    ];
    const parameters: SqlParameter[] = [];

    if (organizationId) {
      conditions.push("c.organizationId = @organizationId");
      parameters.push({ name: "@organizationId", value: organizationId });
    }

    if (status) {
      conditions.push("c.status = @status");
      parameters.push({ name: "@status", value: status });
    }

    if (priority) {
      conditions.push("c.priority = @priority");
      parameters.push({ name: "@priority", value: priority });
    }

    if (search) {
      // Case-insensitive substring match on title and description.
      // CONTAINS is available in Cosmos DB SQL API.
      conditions.push(
        "(CONTAINS(LOWER(c.title), @search, true) OR CONTAINS(LOWER(c.description ?? ''), @search, true))"
      );
      parameters.push({ name: "@search", value: search.toLowerCase() });
    }

    if (tags.length > 0) {
      // Match documents that have ANY of the requested tags using ARRAY_CONTAINS.
      const tagConditions = tags.map((tag, idx) => {
        const paramName = `@tag${idx}`;
        parameters.push({ name: paramName, value: tag });
        return `ARRAY_CONTAINS(c.tags, ${paramName})`;
      });
      conditions.push(`(${tagConditions.join(" OR ")})`);
    }

    const whereClause = conditions.join(" AND ");

    // -----------------------------------------------------------------------
    // 3. Count total matching documents (for pagination metadata)
    // -----------------------------------------------------------------------
    const countQuerySpec: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
      parameters,
    };

    const { resources: countResult } = await container.items
      .query<number>(countQuerySpec)
      .fetchAll();
    const totalCount: number = countResult[0] ?? 0;

    // -----------------------------------------------------------------------
    // 4. Fetch the current page of items
    // -----------------------------------------------------------------------
    const itemsQuerySpec: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE ${whereClause} ORDER BY c._ts DESC OFFSET @offset LIMIT @limit`,
      parameters: [
        ...parameters,
        { name: "@offset", value: offset },
        { name: "@limit", value: pageSize },
      ],
    };

    const { resources: items } = await container.items
      .query<Task>(itemsQuerySpec)
      .fetchAll();

    // -----------------------------------------------------------------------
    // 5. Return paginated response envelope
    // -----------------------------------------------------------------------
    const response: PaginatedResponse<Task> = {
      items,
      totalCount,
      page,
      pageSize,
    };

    return ok(response);
  } catch (error) {
    context.error("Error fetching task list:", error);
    return internalError("fetching the task list");
  }
}

app.http("GetTasks", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "tasks",
  handler: GetTasks,
});
