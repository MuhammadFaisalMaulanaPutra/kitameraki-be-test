export class ValidationError extends Error {
    constructor(readonly details: unknown) {
        super("Invalid request.");
    }
}

export class NotFoundError extends Error {
    constructor() {
        super("Resource not found.");
    }
}

export class ConflictError extends Error {
    constructor() {
        super("Resource conflict.");
    }
}

export function getErrorStatusCode(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }

    const { code, statusCode } = error as { code?: unknown; statusCode?: unknown };
    const value = typeof statusCode === "number" ? statusCode : code;
    return typeof value === "number" ? value : undefined;
}
