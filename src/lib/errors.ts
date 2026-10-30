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
