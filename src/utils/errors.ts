/**
 * Base class for errors that should be translated into a specific
 * HTTP status code and a safe, user-facing message — as opposed to
 * unexpected errors, which should be logged and returned as a
 * generic 500 without leaking internal details.
 */
export class HttpError extends Error {
    constructor(public readonly statusCode: number, message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class BadRequestError extends HttpError {
    constructor(message = 'The request is invalid.') {
        super(400, message);
    }
}

export class NotFoundError extends HttpError {
    constructor(message = 'The requested resource was not found.') {
        super(404, message);
    }
}

export class ValidationError extends BadRequestError {
    constructor(public readonly details: string[]) {
        super(`Validation failed: ${details.join('; ')}`);
    }
}