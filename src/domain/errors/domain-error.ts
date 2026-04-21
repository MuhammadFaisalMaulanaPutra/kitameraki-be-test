export class DomainError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400,
        public details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, DomainError.prototype);
    }
}

export class NotFoundError extends DomainError {
    constructor() {
        super(`Item not found`, 'NOT_FOUND', 404);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class UnauthorizedError extends DomainError {
    constructor(message: string = 'Unauthorized') {
        super(message, 'UNAUTHORIZED', 401);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

export class ValidationError extends DomainError {
    constructor(message: string, public errors: any[] = []) {
        super(message, 'VALIDATION_ERROR', 422, errors);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class ConflictError extends DomainError {
    constructor(message: string) {
        super(message, 'CONFLICT', 409);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

export class InvalidCredentialsError extends DomainError {
    constructor(message: string = "Invalid credentials") {
        super(message, "INVALID_CREDENTIALS", 401);
        Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
    }
}