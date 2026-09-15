import { HttpResponseInit } from "@azure/functions";

export function ok(body?: unknown): HttpResponseInit {
    return { status: 200, jsonBody: body };
}

export function created(body?: unknown): HttpResponseInit {
    return { status: 201, jsonBody: body };
}

export function noContent(): HttpResponseInit {
    return { status: 204 };
}

export function badRequest(errors: string | string[]): HttpResponseInit {
    return { status: 400, jsonBody: { errors: Array.isArray(errors) ? errors : [errors] } };
}

export function notFound(message = "Resource not found"): HttpResponseInit {
    return { status: 404, jsonBody: { error: message } };
}

export function conflict(message: string): HttpResponseInit {
    return { status: 409, jsonBody: { error: message } };
}

export function serverError(): HttpResponseInit {
    return { status: 500, jsonBody: { error: "Internal server error" } };
}
