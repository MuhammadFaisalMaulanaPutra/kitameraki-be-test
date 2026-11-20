import { HttpResponseInit, InvocationContext } from '@azure/functions';
import { AppError } from './errors.util.js';

export function successResponse<T>(data: T, status: number = 200): HttpResponseInit {
    return {
        status,
        jsonBody: {
            success: true,
            data,
        },
        headers: {
            'Content-Type': 'application/json',
        },
    };
}

export function errorResponse(error: unknown, context: InvocationContext): HttpResponseInit {
    if (error instanceof AppError) {
        context.warn(`[${error.errorCode}] ${error.message}`);
        return {
            status: error.statusCode,
            jsonBody: {
                success: false,
                error: {
                    code: error.errorCode,
                    message: error.message,
                },
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }

    if (error instanceof SyntaxError) {
        context.warn(`[BAD_REQUEST] Malformed JSON: ${error.message}`);
        return {
            status: 400,
            jsonBody: {
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: 'Format request body tidak valid (harus berupa JSON yang valid).',
                },
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }

    const unexpectedError = error instanceof Error ? error : new Error(String(error));
    context.error(`[UNHANDLED_ERROR] ${unexpectedError.message}`, unexpectedError.stack);
    return {
        status: 500,
        jsonBody: {
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Terjadi kesalahan internal pada server.',
            },
        },
        headers: {
            'Content-Type': 'application/json',
        },
    };
}