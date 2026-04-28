/**
 * HTTP Parameter Validation
 * Validates query and path parameters from HTTP requests
 */

import {
  ERROR_MESSAGES,
  PAGINATION,
  TASK_STATUS_RANGE,
  VALID_SORT_FIELDS,
  VALIDATION_CONSTRAINTS,
} from "../constants";

/**
 * Validates and extracts organization ID
 * @param organizationId - The organization ID from query parameter
 * @throws Error if organizationId is invalid
 * @returns validated numeric organization ID
 */
export function validateOrganizationId(organizationId: string | null): number {
  if (!organizationId) {
    throw new Error(ERROR_MESSAGES.ORGANIZATION_ID_REQUIRED);
  }

  const parsed = parseInt(organizationId, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(ERROR_MESSAGES.ORGANIZATION_ID_REQUIRED);
  }

  return parsed;
}

/**
 * Validates and extracts task ID
 * @param taskId - The task ID from query parameter
 * @throws Error if taskId is invalid
 * @returns validated task ID
 */
export function validateTaskId(taskId: string | null): string {
  if (!taskId || taskId.trim() === "") {
    throw new Error(ERROR_MESSAGES.TASK_ID_REQUIRED);
  }

  return taskId.trim();
}

/**
 * Validates and extracts pagination parameters
 * @param pageNumberParam - Page number from query (default: "1")
 * @param pageSizeParam - Page size from query (default: "10")
 * @returns Object with validated pageNumber, pageSize, and offset
 */
export function validatePaginationParams(
  pageNumberParam: string = "1",
  pageSizeParam: string = "10"
): { pageNumber: number; pageSize: number; offset: number } {
  const pageNumber = Math.max(
    PAGINATION.DEFAULT_PAGE_NUMBER,
    parseInt(pageNumberParam, 10) || PAGINATION.DEFAULT_PAGE_NUMBER
  );

  const pageSize = Math.max(
    PAGINATION.MIN_PAGE_SIZE,
    Math.min(
      PAGINATION.MAX_PAGE_SIZE,
      parseInt(pageSizeParam, 10) || PAGINATION.DEFAULT_PAGE_SIZE
    )
  );

  const offset = (pageNumber - 1) * pageSize;

  return { pageNumber, pageSize, offset };
}

/**
 * Validates and extracts sort parameters
 * @param sortBy - Sort field name
 * @param sortOrder - Sort direction (asc or desc)
 * @returns Object with validated sortField and sortDirection
 */
export function validateSortParams(
  sortBy: string = "createdAt",
  sortOrder: string = "desc"
): { sortField: string; sortDirection: "ASC" | "DESC" } {
  const sortField = (VALID_SORT_FIELDS as readonly string[]).includes(sortBy)
    ? sortBy
    : "createdAt";

  const sortDirection = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

  return { sortField, sortDirection };
}

/**
 * Validates and extracts status filter parameter
 * @param statusParam - Status value from query parameter
 * @returns Status value if valid, null if not provided
 * @throws Error if provided but invalid
 */
export function validateStatusFilter(statusParam: string | null): number | null {
  if (statusParam === null || statusParam === "") {
    return null;
  }

  const statusValue = parseInt(statusParam, 10);

  if (isNaN(statusValue)) {
    throw new Error(ERROR_MESSAGES.INVALID_STATUS_VALUE);
  }

  if (statusValue < TASK_STATUS_RANGE.MIN || statusValue > TASK_STATUS_RANGE.MAX) {
    throw new Error(ERROR_MESSAGES.INVALID_STATUS);
  }

  return statusValue;
}

/**
 * Validates and extracts search term
 * @param searchTerm - Search term from query parameter
 * @returns Trimmed search term
 * @throws Error if search term exceeds max length
 */
export function validateSearchTermParam(searchTerm: string = ""): string {
  const trimmed = searchTerm.trim();

  if (trimmed.length > VALIDATION_CONSTRAINTS.SEARCH_TERM_MAX_LENGTH) {
    throw new Error(ERROR_MESSAGES.SEARCH_TERM_TOO_LONG);
  }

  return trimmed;
}

/**
 * Validates task IDs array for bulk operations
 * @param taskIds - Array of task IDs
 * @throws Error if array is empty or invalid
 * @returns Validated task IDs array
 */
export function validateTaskIdsArray(taskIds: any): string[] {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    throw new Error(ERROR_MESSAGES.INVALID_TASK_IDS);
  }

  return taskIds.map((id) => String(id).trim()).filter((id) => id.length > 0);
}
