import { RestError } from "@azure/cosmos";

export function isCosmosNotFoundError(error: unknown): boolean {
  if (error instanceof RestError && error.statusCode === 404) {
    return true;
  }
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    return err.statusCode === 404 || err.code === 404 || err.code === "404";
  }
  return false;
}



export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request payload", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}
