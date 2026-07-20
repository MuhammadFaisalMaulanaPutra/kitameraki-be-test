import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { ZodError } from "zod";

/**
 * Higher-order function yang membungkus Azure Function handler
 * dengan centralized error handling.
 *
 * - ZodError → 400 dengan detail field-level errors
 * - Cosmos 404 → 404 Not Found
 * - Lainnya → 500 Internal Server Error (tanpa expose detail)
 */
export function withErrorHandler(
  handler: (
    request: HttpRequest,
    context: InvocationContext
  ) => Promise<HttpResponseInit>
) {
  return async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    try {
      return await handler(request, context);
    } catch (error: unknown) {
      // ---------- Zod Validation Error ----------
      if (error instanceof ZodError) {
        const fieldErrors = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        context.warn(`Validation failed: ${JSON.stringify(fieldErrors)}`);

        return {
          status: 400,
          jsonBody: {
            error: "Validation Error",
            details: fieldErrors,
          },
        };
      }

      // ---------- Cosmos DB Errors ----------
      if (isCosmosError(error)) {
        const code = error.code;

        if (code === 404) {
          context.warn(`Resource not found: ${error.message}`);
          return {
            status: 404,
            jsonBody: { error: "Resource not found" },
          };
        }

        if (code === 409) {
          context.warn(`Conflict: ${error.message}`);
          return {
            status: 409,
            jsonBody: { error: "Resource already exists" },
          };
        }
      }

      // ---------- Generic / Unknown Error ----------
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      context.error(`Unhandled error: ${errorMessage}`);

      return {
        status: 500,
        jsonBody: {
          error: "Internal Server Error",
          // Tidak pernah expose stack trace atau detail internal
        },
      };
    }
  };
}

/**
 * Type guard untuk Cosmos DB errors yang memiliki `code` (HTTP status).
 */
function isCosmosError(
  error: unknown
): error is { code: number; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "number"
  );
}
