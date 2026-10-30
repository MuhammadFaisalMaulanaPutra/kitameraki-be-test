import { HttpHandler, HttpResponseInit } from "@azure/functions";
import { z } from "zod";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

function errorResponse(statusCode: number, code: string, message: string, details?: unknown): HttpResponseInit {
    return {
        jsonBody: {
            error: {
                code,
                message,
                ...(details === undefined ? {} : { details })
            }
        },
        status: statusCode
    };
}

function getStatusCode(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }

    const { code, statusCode } = error as { code?: unknown; statusCode?: unknown };
    const value = typeof statusCode === "number" ? statusCode : code;
    return typeof value === "number" ? value : undefined;
}

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);

    if (!result.success) {
        throw new ValidationError(z.flattenError(result.error));
    }

    return result.data;
}

export function withErrorHandling(handler: HttpHandler): HttpHandler {
    return async (request, context) => {
        try {
            return await handler(request, context);
        } catch (error) {
            if (error instanceof ValidationError) {
                return errorResponse(400, "VALIDATION_ERROR", error.message, error.details);
            }
            if (error instanceof NotFoundError) {
                return errorResponse(404, "NOT_FOUND", error.message);
            }
            if (error instanceof ConflictError) {
                return errorResponse(409, "CONFLICT", error.message);
            }

            if (error instanceof SyntaxError) {
                return errorResponse(400, "INVALID_JSON", "Invalid JSON body.");
            }

            const status = getStatusCode(error);
            if (status === 404) {
                return errorResponse(404, "NOT_FOUND", "Resource not found.");
            }
            if (status === 409) {
                return errorResponse(409, "CONFLICT", "Resource conflict.");
            }

            context.error(error);
            return errorResponse(500, "INTERNAL_ERROR", "Internal server error.");
        }
    };
}
