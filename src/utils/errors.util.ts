export abstract class AppError extends Error {
    abstract readonly statusCode: number;
    abstract readonly errorCode: string;
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class BadRequestError extends AppError {
    readonly statusCode = 400;
    readonly errorCode = 'BAD_REQUEST';
}

export class NotFoundError extends AppError {
    readonly statusCode = 404;
    readonly errorCode = 'NOT_FOUND';
}

export class InternalServerError extends AppError {
    readonly statusCode = 500;
    readonly errorCode = 'INTERNAL_SERVER_ERROR';
}