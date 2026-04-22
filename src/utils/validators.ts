/**
 * @file validators.ts
 * @description Pure validation functions for all incoming request payloads.
 *
 * Centralising validation logic here keeps handlers thin and makes the
 * validation rules easy to test and evolve independently. Each validator
 * returns a tuple of [isValid, errorMessage] so the handler can branch
 * cleanly without exceptions.
 *
 * All validation follows the constraints defined in task.schema.json.
 */

import { CreateTaskRequest, CustomField, CustomFieldType, UpdateTaskRequest } from "../models/models";

const VALID_PRIORITIES = new Set(["low", "medium", "high"]);
const VALID_STATUSES = new Set(["todo", "in-progress", "completed"]);
const VALID_CUSTOM_FIELD_TYPES: CustomFieldType[] = ["text", "date", "datetime", "email"];

// ---------------------------------------------------------------------------
// Task validators
// ---------------------------------------------------------------------------

/**
 * Validates the body of a CreateTask request.
 * Returns `null` on success, or a descriptive error string on failure.
 */
export function validateCreateTaskRequest(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const req = body as Record<string, unknown>;

  // Required fields
  if (!req.title || typeof req.title !== "string" || req.title.trim().length === 0) {
    return '"title" is required and must be a non-empty string.';
  }
  if (req.title.length > 100) {
    return '"title" must not exceed 100 characters.';
  }

  if (!req.organizationId || typeof req.organizationId !== "string") {
    return '"organizationId" is required and must be a string.';
  }

  if (!req.status || !VALID_STATUSES.has(req.status as string)) {
    return `"status" is required and must be one of: ${[...VALID_STATUSES].join(", ")}.`;
  }

  // Optional fields
  if (req.description !== undefined) {
    if (typeof req.description !== "string") return '"description" must be a string.';
    if (req.description.length > 1000) return '"description" must not exceed 1000 characters.';
  }

  if (req.priority !== undefined && !VALID_PRIORITIES.has(req.priority as string)) {
    return `"priority" must be one of: ${[...VALID_PRIORITIES].join(", ")}.`;
  }

  if (req.dueDate !== undefined) {
    if (typeof req.dueDate !== "string" || isNaN(Date.parse(req.dueDate))) {
      return '"dueDate" must be a valid ISO 8601 date-time string.';
    }
  }

  if (req.tags !== undefined) {
    if (!Array.isArray(req.tags)) return '"tags" must be an array of strings.';
    for (const tag of req.tags) {
      if (typeof tag !== "string") return 'Each item in "tags" must be a string.';
      if (tag.length > 50) return 'Each tag must not exceed 50 characters.';
    }
  }

  return null;
}

/**
 * Validates the body of an UpdateTask (PATCH) request.
 * Returns `null` on success, or a descriptive error string on failure.
 * All fields are optional, but at least one must be present.
 */
export function validateUpdateTaskRequest(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const req = body as Record<string, unknown>;

  if (Object.keys(req).length === 0) {
    return "Request body must contain at least one field to update.";
  }

  if (req.title !== undefined) {
    if (typeof req.title !== "string" || req.title.trim().length === 0) {
      return '"title" must be a non-empty string.';
    }
    if (req.title.length > 100) return '"title" must not exceed 100 characters.';
  }

  if (req.description !== undefined) {
    if (typeof req.description !== "string") return '"description" must be a string.';
    if (req.description.length > 1000) return '"description" must not exceed 1000 characters.';
  }

  if (req.status !== undefined && !VALID_STATUSES.has(req.status as string)) {
    return `"status" must be one of: ${[...VALID_STATUSES].join(", ")}.`;
  }

  if (req.priority !== undefined && !VALID_PRIORITIES.has(req.priority as string)) {
    return `"priority" must be one of: ${[...VALID_PRIORITIES].join(", ")}.`;
  }

  if (req.dueDate !== undefined) {
    if (typeof req.dueDate !== "string" || isNaN(Date.parse(req.dueDate))) {
      return '"dueDate" must be a valid ISO 8601 date-time string.';
    }
  }

  if (req.tags !== undefined) {
    if (!Array.isArray(req.tags)) return '"tags" must be an array of strings.';
    for (const tag of req.tags) {
      if (typeof tag !== "string") return 'Each item in "tags" must be a string.';
      if (tag.length > 50) return 'Each tag must not exceed 50 characters.';
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Settings validators
// ---------------------------------------------------------------------------

/**
 * Validates the body of an UpsertSettings request.
 * Returns `null` on success, or a descriptive error string on failure.
 */
export function validateUpsertSettingsRequest(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const req = body as Record<string, unknown>;

  if (!Array.isArray(req.customFields)) {
    return '"customFields" is required and must be an array.';
  }

  for (let i = 0; i < req.customFields.length; i++) {
    const field = req.customFields[i] as Record<string, unknown>;

    if (!field.fieldId || typeof field.fieldId !== "string") {
      return `customFields[${i}].fieldId is required and must be a string.`;
    }
    if (!field.label || typeof field.label !== "string" || field.label.trim().length === 0) {
      return `customFields[${i}].label is required and must be a non-empty string.`;
    }
    if (!VALID_CUSTOM_FIELD_TYPES.includes(field.type as CustomFieldType)) {
      return `customFields[${i}].type must be one of: ${VALID_CUSTOM_FIELD_TYPES.join(", ")}.`;
    }
    if (typeof field.required !== "boolean") {
      return `customFields[${i}].required must be a boolean.`;
    }
    if (typeof field.order !== "number") {
      return `customFields[${i}].order must be a number.`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Query parameter helpers
// ---------------------------------------------------------------------------

/**
 * Parses a positive integer from a string query parameter.
 * Returns the parsed value on success, or `defaultValue` if the string is
 * absent, empty, or not a positive integer.
 */
export function parsePositiveInt(value: string | null, defaultValue: number): number {
  if (value === null || value.trim() === "") return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}
