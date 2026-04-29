/**
 * Application Constants
 * Centralized configuration for database names, pagination, validation rules, etc.
 */

// ============ DATABASE CONFIGURATION ============
export const DB_CONFIG = {
  DATABASE_NAME: "TaskApp",
  CONTAINER_NAME: "Tasks",
  FORM_SETTINGS_CONTAINER_NAME: "FormSettings",
} as const;

// ============ PAGINATION CONFIGURATION ============
export const PAGINATION = {
  DEFAULT_PAGE_NUMBER: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

// ============ TASK STATUS CONFIGURATION ============
export const TASK_STATUS_RANGE = {
  MIN: 0,
  MAX: 3,
} as const;

export const TASK_STATUS_LABELS: Record<number, string> = {
  0: "NOT_STARTED",
  1: "IN_PROGRESS",
  2: "COMPLETED",
  3: "CANCELLED",
} as const;

// ============ SORTING CONFIGURATION ============
export const VALID_SORT_FIELDS = ["createdAt", "updatedAt", "name", "status"] as const;

export const SORT_DIRECTION = {
  ASC: "ASC",
  DESC: "DESC",
} as const;

// ============ VALIDATION CONSTRAINTS ============
export const VALIDATION_CONSTRAINTS = {
  TASK_NAME_MIN_LENGTH: 1,
  TASK_NAME_MAX_LENGTH: 255,
  TASK_DESCRIPTION_MAX_LENGTH: 2000,
  SEARCH_TERM_MAX_LENGTH: 100,
} as const;

// ============ PROTECTED FIELDS ============
export const PROTECTED_FIELDS = [
  "organizationId",
  "id",
  "createdAt",
  "isDeleted",
] as const;

// ============ ALLOWED FIELDS FOR TASK CREATION ============
export const ALLOWED_TASK_FIELDS = [
  "name",
  "description",
  "status",
] as const;

// ============ HTTP STATUS CODES ============
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============ ERROR MESSAGES ============
export const ERROR_MESSAGES = {
  ORGANIZATION_ID_REQUIRED: "Organization ID is required",
  TASK_ID_REQUIRED: "Task ID is required",
  TASK_NAME_REQUIRED: "Task name is required and must be a non-empty string",
  TASK_NAME_TOO_LONG: `Task name must not exceed ${VALIDATION_CONSTRAINTS.TASK_NAME_MAX_LENGTH} characters`,
  TASK_DESCRIPTION_TOO_LONG: `Task description must not exceed ${VALIDATION_CONSTRAINTS.TASK_DESCRIPTION_MAX_LENGTH} characters`,
  SEARCH_TERM_TOO_LONG: `Search term must not exceed ${VALIDATION_CONSTRAINTS.SEARCH_TERM_MAX_LENGTH} characters`,
  INVALID_STATUS: `Status must be between ${TASK_STATUS_RANGE.MIN}-${TASK_STATUS_RANGE.MAX} (0: NOT_STARTED, 1: IN_PROGRESS, 2: COMPLETED, 3: CANCELLED)`,
  STATUS_MUST_BE_NUMBER: "Status must be a number",
  DESCRIPTION_MUST_BE_STRING: "Description must be a string if provided",
  BODY_REQUIRED: "Request body must contain at least one field to update",
  TASK_NOT_FOUND: "Task not found",
  INVALID_SORT_FIELD: "Invalid sort field",
  INVALID_PAGE_SIZE: `Page size must be between ${PAGINATION.MIN_PAGE_SIZE}-${PAGINATION.MAX_PAGE_SIZE}`,
  INVALID_PAGE_NUMBER: "Page number must be a positive integer",
  INVALID_STATUS_VALUE: "Invalid status value",
  INVALID_TASK_IDS: "Task IDs array is required and must not be empty",
  INVALID_FIELD_TYPE: "Invalid field type. Must be one of: text, date, datetime, email",
  INVALID_COLUMN: "Column must be 0 or 1",
  INVALID_ORDER: "Order must be a non-negative number",
  FIELD_LABEL_REQUIRED: "Field label is required",
  FIELD_ID_REQUIRED: "Field ID is required",
  FIELDS_ARRAY_REQUIRED: "Fields array is required",
} as const;
