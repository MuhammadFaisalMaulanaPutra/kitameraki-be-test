import { randomUUID } from "crypto";
import type { HttpResponseInit } from "@azure/functions";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/http.types";
import { AppError } from "./errors";

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "X-XSS-Protection": "0",
};

export function ok<T>(data: T, meta?: Record<string, unknown>): HttpResponseInit {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta,
  };
  return {
    status: 200,
    headers: { ...SECURITY_HEADERS },
    jsonBody: body,
  };
}

export function created<T>(data: T): HttpResponseInit {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  return {
    status: 201,
    headers: { ...SECURITY_HEADERS },
    jsonBody: body,
  };
}

export function noContent(): HttpResponseInit {
  const { "Content-Type": _, ...securityHeadersWithoutContentType } = SECURITY_HEADERS;
  return {
    status: 204,
    headers: securityHeadersWithoutContentType,
  };
}

export function badRequest(message: string, details?: unknown): HttpResponseInit {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: "BAD_REQUEST",
      message,
      details,
    },
  };
  return {
    status: 400,
    headers: { ...SECURITY_HEADERS },
    jsonBody: body,
  };
}

export function notFound(message = "Resource not found"): HttpResponseInit {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message,
    },
  };
  return {
    status: 404,
    headers: { ...SECURITY_HEADERS },
    jsonBody: body,
  };
}

export function handleControllerError(error: unknown): HttpResponseInit {
  const requestId = randomUUID();

  if (error instanceof AppError) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
    return {
      status: error.statusCode,
      headers: { ...SECURITY_HEADERS },
      jsonBody: body,
    };
  }

  const isProduction = process.env.NODE_ENV === "production";
  const rawMessage = error instanceof Error ? error.message : "An unexpected error occurred";
  const errMessage = isProduction ? "An unexpected internal server error occurred" : rawMessage;

  console.error(`[Error] Request ID: ${requestId} - Internal error:`, error);

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: errMessage,
      ...(isProduction ? { requestId } : {}),
    },
  };
  return {
    status: 500,
    headers: { ...SECURITY_HEADERS },
    jsonBody: body,
  };
}
