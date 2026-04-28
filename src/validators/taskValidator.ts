/**
 * Task Data Validation
 * Validates task-related input data
 */

import { ETaskStatus } from "../interfaces/Task.interface";
import {
  ERROR_MESSAGES,
  TASK_STATUS_RANGE,
  VALIDATION_CONSTRAINTS,
} from "../constants";

/**
 * Validates task status value
 * @param status - The status value to validate
 * @throws Error if status is invalid
 * @returns true if valid
 */
export function validateTaskStatus(status: any): boolean {
  if (typeof status !== "number") {
    throw new Error(ERROR_MESSAGES.STATUS_MUST_BE_NUMBER);
  }

  if (status < TASK_STATUS_RANGE.MIN || status > TASK_STATUS_RANGE.MAX) {
    throw new Error(ERROR_MESSAGES.INVALID_STATUS);
  }

  return true;
}

/**
 * Validates task name
 * @param name - The task name to validate
 * @throws Error if name is invalid
 * @returns true if valid
 */
export function validateTaskName(name: any): boolean {
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error(ERROR_MESSAGES.TASK_NAME_REQUIRED);
  }

  if (name.length > VALIDATION_CONSTRAINTS.TASK_NAME_MAX_LENGTH) {
    throw new Error(ERROR_MESSAGES.TASK_NAME_TOO_LONG);
  }

  return true;
}

/**
 * Validates task description
 * @param description - The task description to validate
 * @throws Error if description is invalid
 * @returns true if valid
 */
export function validateTaskDescription(description: any): boolean {
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      throw new Error(ERROR_MESSAGES.DESCRIPTION_MUST_BE_STRING);
    }

    if (description.length > VALIDATION_CONSTRAINTS.TASK_DESCRIPTION_MAX_LENGTH) {
      throw new Error(ERROR_MESSAGES.TASK_DESCRIPTION_TOO_LONG);
    }
  }

  return true;
}

/**
 * Validates search term
 * @param searchTerm - The search term to validate
 * @throws Error if search term is invalid
 * @returns true if valid
 */
export function validateSearchTerm(searchTerm: string): boolean {
  if (searchTerm.length > VALIDATION_CONSTRAINTS.SEARCH_TERM_MAX_LENGTH) {
    throw new Error(ERROR_MESSAGES.SEARCH_TERM_TOO_LONG);
  }

  return true;
}

/**
 * Validates complete task post data
 * @param data - The task data to validate
 * @throws Error if validation fails
 * @returns true if valid
 */
export function validateTaskPostData(data: any): boolean {
  validateTaskName(data?.name);

  if (data?.status !== undefined && data?.status !== null) {
    validateTaskStatus(data.status);
  }

  if (data?.description !== undefined) {
    validateTaskDescription(data.description);
  }

  return true;
}

/**
 * Validates task update data
 * @param data - The task data to update
 * @throws Error if validation fails
 * @returns true if valid
 */
export function validateTaskUpdateData(data: any): boolean {
  if (!data || Object.keys(data).length === 0) {
    throw new Error(ERROR_MESSAGES.BODY_REQUIRED);
  }

  // Validate individual fields if provided
  if (data.name !== undefined) {
    validateTaskName(data.name);
  }

  if (data.status !== undefined) {
    validateTaskStatus(data.status);
  }

  if (data.description !== undefined) {
    validateTaskDescription(data.description);
  }

  return true;
}
