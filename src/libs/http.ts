export class HttpError extends Error {
  status: number;

  constructor(message?: string, status?: number) {
    super(message);
    this.status = status ?? 400;
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

export function createResponse(jsonBody: {}, status: number = 200) {
  return { jsonBody, status };
}

export function response500(message?: string, e?: any) {
  console.error("Error for response 500:", message);
  console.error(e);

  return createResponse("Server Error", 500);
}
