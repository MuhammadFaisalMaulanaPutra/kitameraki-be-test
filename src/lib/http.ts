import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value); 

export function requireOrgId(request: HttpRequest): string {
  const org = request.query.get("organizationId");
  if (!isUuid(org)) throw new HttpError(400, "organizationId must be UUID");
  return org;
}

export function requireIdParam(request: HttpRequest): string {
  const id = request.params.id;
  if (!isUuid(id)) throw new HttpError(400, "id must be UUID");
  return id;
} 

export async function readJson(request: HttpRequest): Promise<Record<string, unknown>> {
  let body: unknown;
  
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Request Body must be a valid JSON");
  }

  if (typeof body !== "object" || body === null || Array.isArray (body)) {
    throw new HttpError(400, "Request Body must be a JSON Object");
  }

  return body as Record<string, unknown>;
}

type Handler = (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;

export function handler(fn: Handler): Handler {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      if (err instanceof HttpError) return { status: err.status, jsonBody: { error: err.message } };

      const code = (err as { code?: number }).code;
      if (code === 404) return { status: 404, jsonBody: { error: "Not found" } };
      if (code === 409) return { status: 409, jsonBody: { error: "Conflict" } };
      if (code === 412) return { status: 409, jsonBody: { error: "Task was modified by someone else, reload and retry" } };
      context.error("Unhandled error", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  };
}
