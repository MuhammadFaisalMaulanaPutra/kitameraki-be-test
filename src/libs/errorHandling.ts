/**
 * Error Handling Utilities
 * Centralized error handling and structured error responses
 */

import { HTTP_STATUS } from "../constants";

/**
 * Structured application error
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = HTTP_STATUS.BAD_REQUEST,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", code?: string) {
    super(message, HTTP_STATUS.NOT_FOUND, code);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Structured error response
 */
export interface ErrorResponse {
  error: true;
  message: string;
  code?: string;
  status: number;
  timestamp: string;
}

/**
 * Success response wrapper
 */
export interface SuccessResponse<T> {
  data: T;
  status: number;
  timestamp: string;
}

/**
 * Creates an error response
 * @param error - The error or error message
 * @param status - HTTP status code
 * @returns Structured error response
 */
export function createErrorResponse(
  error: Error | string | AppError,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
): ErrorResponse {
  let message = "Internal Server Error";
  let code: string | undefined;

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof AppError) {
    message = error.message;
    status = error.status;
    code = error.code;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return {
    error: true,
    message,
    code,
    status,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a success response
 * @param data - Response data
 * @param status - HTTP status code
 * @returns Structured success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = HTTP_STATUS.OK
): SuccessResponse<T> {
  return {
    data,
    status,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Structured logger for consistent logging
 */
export class Logger {
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
  }

  /**
   * Logs info level message
   */
  info(message: string, context?: any): void {
    console.log(
      JSON.stringify({
        level: "INFO",
        function: this.functionName,
        message,
        context,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Logs warning level message
   */
  warn(message: string, context?: any): void {
    console.warn(
      JSON.stringify({
        level: "WARN",
        function: this.functionName,
        message,
        context,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Logs error level message (without stack trace)
   */
  error(message: string, error?: Error | AppError, context?: any): void {
    const errorData: any = {
      level: "ERROR",
      function: this.functionName,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof AppError) {
      errorData.code = error.code;
      errorData.status = error.status;
    } else if (error instanceof Error) {
      // Don't include full stack trace in logs for security
      errorData.errorType = error.constructor.name;
    }

    console.error(JSON.stringify(errorData));
  }

  /**
   * Logs debug level message
   */
  debug(message: string, context?: any): void {
    if (process.env.DEBUG === "true") {
      console.debug(
        JSON.stringify({
          level: "DEBUG",
          function: this.functionName,
          message,
          context,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}
