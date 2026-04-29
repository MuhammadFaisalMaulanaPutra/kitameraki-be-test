/**
 * Cosmos DB Query Builder
 * Safely constructs Cosmos DB queries with proper escaping and validation
 */

import { SORT_DIRECTION } from "../constants";

interface QueryBuilderOptions {
  organizationId: number;
  includeDeleted?: boolean;
  status?: number;
  searchTerm?: string;
  sortField?: string;
  sortDirection?: "ASC" | "DESC";
  offset?: number;
  pageSize?: number;
}

/**
 * Escapes single quotes in strings for safe SQL inclusion
 * @param value - The string to escape
 * @returns Escaped string
 */
function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Builds a Cosmos DB count query with filters
 * @param organizationId - The organization ID
 * @param status - Optional status filter
 * @param searchTerm - Optional search term
 * @returns SQL query string
 */
export function buildCountQuery(
  organizationId: number,
  status?: number,
  searchTerm?: string
): string {
  let conditions = [
    `c.organizationId = ${organizationId}`,
    "c.isDeleted = false",
  ];

  if (typeof status === "number") {
    conditions.push(`c.status = ${status}`);
  }

  if (searchTerm) {
    const escapedTerm = escapeSqlString(searchTerm);
    conditions.push(
      `(CONTAINS(LOWER(c.name), LOWER('${escapedTerm}')) OR CONTAINS(LOWER(c.description), LOWER('${escapedTerm}')))`
    );
  }

  const whereClause = conditions.join(" AND ");
  return `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`;
}

/**
 * Builds a Cosmos DB select query with filters, sorting, and pagination
 * @param options - Query builder options
 * @returns SQL query string
 */
export function buildSelectQuery(options: QueryBuilderOptions): string {
  const {
    organizationId,
    includeDeleted = false,
    status,
    searchTerm,
    sortField = "createdAt",
    sortDirection = SORT_DIRECTION.DESC,
    offset = 0,
    pageSize = 10,
  } = options;

  let conditions = [
    `c.organizationId = ${organizationId}`,
  ];

  if (!includeDeleted) {
    conditions.push("c.isDeleted = false");
  }

  if (status !== undefined && status !== null) {
    conditions.push(`c.status = ${status}`);
  }

  if (searchTerm) {
    const escapedTerm = escapeSqlString(searchTerm);
    conditions.push(
      `(CONTAINS(LOWER(c.name), LOWER('${escapedTerm}')) OR CONTAINS(LOWER(c.description), LOWER('${escapedTerm}')))`
    );
  }

  const whereClause = conditions.join(" AND ");
  return `SELECT * FROM c WHERE ${whereClause} ORDER BY c.${sortField} ${sortDirection} OFFSET ${offset} LIMIT ${pageSize}`;
}

/**
 * Builds a query to get a single task by ID
 * @param taskId - The task ID
 * @param organizationId - The organization ID
 * @returns SQL query string
 */
export function buildGetSingleTaskQuery(taskId: string, organizationId: number): string {
  return `SELECT * FROM c WHERE c.id = '${escapeSqlString(taskId)}' AND c.organizationId = ${organizationId} AND c.isDeleted = false`;
}

/**
 * Validates and sanitizes query parameters to prevent injection
 * @param value - The value to sanitize
 * @param type - The expected type
 * @returns Sanitized value
 */
export function sanitizeQueryParam(value: any, type: "string" | "number"): any {
  if (type === "string") {
    if (typeof value !== "string") {
      throw new Error("Invalid string parameter");
    }
    return escapeSqlString(value);
  }

  if (type === "number") {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error("Invalid numeric parameter");
    }
    return num;
  }

  return value;
}
