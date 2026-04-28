/**
 * HTTP Response Utilities
 * Provides consistent response formatting
 * @deprecated Use errorHandling.ts instead for new error handling
 */

export class HttpError extends Error {
  status: number;

  constructor(message?: string, status?: number) {
    super(message);
    this.status = status ?? 400;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  createResponse() {
    return createResponse(
      {
        error: true,
        message: this.message,
      },
      this.status,
    );
  }
}

export function createResponse(jsonBody: any, status: number = 200) {
  return { jsonBody, status };
}

/**
 * @deprecated Use Logger from errorHandling.ts
 */
export function response500(message?: string, e?: any) {
  console.error(
    JSON.stringify({
      level: "ERROR",
      message: message || "Internal Server Error",
      error: e?.message || String(e),
      timestamp: new Date().toISOString(),
    })
  );

  return createResponse(
    {
      error: true,
      message: "Internal Server Error",
    },
    500
  );
}
