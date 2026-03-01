import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export interface ErrorResponseBody {
    error: string;
    name?: string;
    code?: string | number;
}

export class HttpError extends Error {
    constructor(
        public readonly httpStatus: number,
        message: string
    ) {
        super(message);
        this.name = "HttpError";
    }
}

const NETWORK_ERROR_RE = /timed out|timeout|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ECONNRESET|certificate/i;

export function classifyStatusCode(message: string): number {
    return NETWORK_ERROR_RE.test(message) ? 503 : 500;
}

export async function parseJson<T extends object>(request: HttpRequest): Promise<T> {
    let parsed: unknown;
    try {
        parsed = await request.json();
    } catch {
        throw new HttpError(400, "Request body must be valid JSON.");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new HttpError(400, "Request body must be a JSON object.");
    }

    return parsed as T;
}

export function json(status: number, body: unknown): HttpResponseInit {
    return { status, jsonBody: body };
}

export function ok(body: unknown): HttpResponseInit {
    return json(200, body);
}

export function noContent(): HttpResponseInit {
    return { status: 204 };
}

export function toErrorResponse(error: unknown): ErrorResponseBody {
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "UnknownError";
    const code = (error as { code?: string | number }).code;

    const body: ErrorResponseBody = { error: message, name };
    if (code !== undefined) body.code = code;
    return body;
}

export function handleError(context: InvocationContext, error: unknown, label: string): HttpResponseInit {
    if (error instanceof HttpError) {
        context.warn(`[${label}] Client error: ${error.message}`);
        return json(error.httpStatus, { error: error.message });
    }

    const responseBody = toErrorResponse(error);
    const message = responseBody.error;

    // Log securely without leaking secrets
    context.error(`[${label}] Unhandled error: ${responseBody.name}: ${message}`);

    return json(classifyStatusCode(message), responseBody);
}
