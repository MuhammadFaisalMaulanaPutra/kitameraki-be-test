/**
 * @file models.ts
 * @description Canonical TypeScript interfaces and enums for all domain entities
 * used across the Task Management API.
 *
 * Keeping types in a single location ensures consistency between handlers,
 * enables compile-time correctness checks, and serves as living documentation
 * for the data contracts consumed by the front-end.
 *
 * All interfaces align with the JSON schema defined in task.schema.json.
 */

// ---------------------------------------------------------------------------
// Task entity
// ---------------------------------------------------------------------------

/** Allowed priority levels for a task. */
export type TaskPriority = "low" | "medium" | "high";

/** Allowed lifecycle statuses for a task. */
export type TaskStatus = "todo" | "in-progress" | "completed";

/**
 * Core Task document as stored in Azure Cosmos DB.
 * The `id` field doubles as the Cosmos DB partition key to keep the
 * container design simple for this use-case.
 */
export interface Task {
  /** Unique identifier (UUID v4). Also used as the Cosmos DB partition key. */
  id: string;

  /** Organisation that owns this task. Used for multi-tenant filtering. */
  organizationId: string;

  /** Short, human-readable title. Max 100 characters. */
  title: string;

  /** Optional longer description. Max 1000 characters. */
  description?: string;

  /** ISO 8601 date-time string representing when the task is due. */
  dueDate?: string;

  /** Priority level of the task. */
  priority?: TaskPriority;

  /** Current lifecycle status. */
  status: TaskStatus;

  /** Free-form labels associated with the task. Each tag max 50 characters. */
  tags?: string[];

  /**
   * Map of custom field values submitted via a dynamically configured form.
   * Keys are the `fieldId` values from the active CustomField settings.
   */
  customFieldValues?: Record<string, unknown>;

  /** ISO 8601 timestamp set server-side on creation. */
  createdAt?: string;

  /** ISO 8601 timestamp updated server-side on every mutation. */
  updatedAt?: string;
}

/** Shape of the request body accepted by the InsertTask handler. */
export type CreateTaskRequest = Omit<Task, "id" | "createdAt" | "updatedAt">;

/** Shape of the request body accepted by the UpdateTask handler. */
export type UpdateTaskRequest = Partial<
  Omit<Task, "id" | "organizationId" | "createdAt" | "updatedAt">
>;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Generic paginated response envelope returned by list endpoints.
 * Using a consistent envelope simplifies front-end data fetching logic.
 */
export interface PaginatedResponse<T> {
  /** The items in the current page. */
  items: T[];

  /** Total number of items matching the current filter (used for page-count calculation). */
  totalCount: number;

  /** 1-based current page number. */
  page: number;

  /** Number of items per page. */
  pageSize: number;

  /** Cosmos DB continuation token for cursor-based pagination (alternative to offset). */
  continuationToken?: string;
}

// ---------------------------------------------------------------------------
// Settings / Custom Fields (Part 2)
// ---------------------------------------------------------------------------

/** Supported input types for dynamically added form fields. */
export type CustomFieldType = "text" | "date" | "datetime" | "email";

/**
 * Definition of a single dynamically configured form field.
 * Stored as part of the global GLOBAL_SETTINGS document in Cosmos DB.
 */
export interface CustomField {
  /** Stable, unique identifier for this field (UUID v4). */
  fieldId: string;

  /** Human-readable label displayed in the UI. Can be renamed by the user. */
  label: string;

  /** The HTML input type that drives rendering and validation on the front-end. */
  type: CustomFieldType;

  /** Whether the field must be filled before submitting the task form. */
  required: boolean;

  /**
   * Display order index. The front-end sorts fields by this value
   * to reflect drag-and-drop reordering.
   */
  order: number;
}

/**
 * The global settings document stored in Cosmos DB.
 * A single document (id = "GLOBAL_SETTINGS") holds the entire configuration.
 */
export interface GlobalSettings {
  /** Fixed document ID used as both the Cosmos DB id and partition key. */
  id: "GLOBAL_SETTINGS";

  /** Discriminator so the container can distinguish settings from tasks. */
  type: "system_config";

  /** Ordered list of custom field definitions. */
  customFields: CustomField[];

  /** ISO 8601 timestamp of the last settings update. */
  updatedAt?: string;
}

/** Shape of the request body accepted by the UpsertSettings handler. */
export interface UpsertSettingsRequest {
  customFields: CustomField[];
}

// ---------------------------------------------------------------------------
// Error response
// ---------------------------------------------------------------------------

/**
 * Standardised error response body returned by all handlers on failure.
 * A consistent error contract makes client-side error handling predictable.
 */
export interface ApiError {
  /** Machine-readable error code (e.g. "VALIDATION_ERROR", "NOT_FOUND"). */
  code: string;

  /** Human-readable description of what went wrong. */
  message: string;

  /** Optional structured details (e.g. per-field validation failures). */
  details?: unknown;
}
