/**
 * @file responseHelpers.ts
 * @description Factory functions for building consistent HTTP response objects
 * across all Azure Function handlers.
 *
 * Using a centralised set of response helpers ensures:
 *  - All success and error payloads follow the same JSON shape.
 *  - HTTP status codes are applied correctly and uniformly.
 *  - CORS and content-type headers are set in one place.
 *  - Individual handlers stay focused on business logic rather than
 *    boilerplate response construction.
 */

import { HttpResponseInit } from "@azure/functions";
import { ApiError } from "../models/models";

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

/**
 * CORS headers applied to every response.
 * In production these should be restricted to the known front-end origin;
 * the wildcard is acceptable for the local development / test environment
 * defined in local.settings.json.
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------------------------------------------------------------------
// Success responses
// ---------------------------------------------------------------------------

/**
 * Returns a 200 OK response with a JSON body.
 */
export function ok<T>(body: T): HttpResponseInit {
  return {
    status: 200,
    headers: CORS_HEADERS,
    jsonBody: body,
  };
}

/**
 * Returns a 201 Created response with a JSON body.
 * Used when a new resource has been successfully persisted.
 */
export function created<T>(body: T): HttpResponseInit {
  return {
    status: 201,
    headers: CORS_HEADERS,
    jsonBody: body,
  };
}

/**
 * Returns a 204 No Content response.
 * Used for successful DELETE operations where no body is required.
 */
export function noContent(): HttpResponseInit {
  return {
    status: 204,
    headers: CORS_HEADERS,
  };
}

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

/**
 * Returns a 400 Bad Request response with a structured error body.
 *
 * @param message - Human-readable description of the validation failure.
 * @param details - Optional structured information (e.g. per-field errors).
 */
export function badRequest(message: string, details?: unknown): HttpResponseInit {
  const error: ApiError = { code: "VALIDATION_ERROR", message, details };
  return {
    status: 400,
    headers: CORS_HEADERS,
    jsonBody: error,
  };
}

/**
 * Returns a 404 Not Found response with a structured error body.
 *
 * @param resourceName - Name of the resource that was not found (e.g. "Task").
 * @param id - The identifier that was looked up.
 */
export function notFound(resourceName: string, id: string): HttpResponseInit {
  const error: ApiError = {
    code: "NOT_FOUND",
    message: `${resourceName} with id "${id}" was not found.`,
  };
  return {
    status: 404,
    headers: CORS_HEADERS,
    jsonBody: error,
  };
}

/**
 * Returns a 500 Internal Server Error response with a structured error body.
 * The raw error is intentionally NOT included in the response body to avoid
 * leaking internal implementation details to the client.
 *
 * @param context - Descriptive context string for logging (e.g. "fetching task list").
 */
export function internalError(context: string): HttpResponseInit {
  const error: ApiError = {
    code: "INTERNAL_SERVER_ERROR",
    message: `An unexpected error occurred while ${context}. Please try again later.`,
  };
  return {
    status: 500,
    headers: CORS_HEADERS,
    jsonBody: error,
  };
}

/**
 * Returns a 200 OK with CORS headers — used for pre-flight OPTIONS requests.
 */
export function preflight(): HttpResponseInit {
  return {
    status: 200,
    headers: CORS_HEADERS,
  };
}

// ---------------------------------------------------------------------------
// Cosmos DB error classifier
// ---------------------------------------------------------------------------

/**
 * Determines whether a Cosmos DB SDK error represents a "document not found"
 * condition (HTTP 404).
 *
 * The Cosmos SDK throws an error object with a numeric `code` property rather
 * than a plain integer, which is why comparing `error === 404` (as seen in
 * the original code) will always be false.
 */
export function isCosmosNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 404
  );
}
