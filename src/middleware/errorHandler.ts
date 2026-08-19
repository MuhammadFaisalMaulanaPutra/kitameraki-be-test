import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { HttpError } from '../utils/errors';

type Handler = (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;

/**
 * Wraps an Azure Function handler so that every endpoint gets
 * consistent error handling:
 *  - Known, expected errors (HttpError subclasses) are returned with
 *    their intended status code and a safe message.
 *  - Anything unexpected is logged server-side via `context.error`
 *    and returned as a generic 500, so internal details (stack
 *    traces, Cosmos DB error messages, etc.) never reach the client.
 */
export function withErrorHandling(handler: Handler): Handler {
    return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            return await handler(request, context);
        } catch (error) {
            if (error instanceof HttpError) {
                return {
                    status: error.statusCode,
                    jsonBody: { error: error.message },
                };
            }

            context.error('Unhandled error while processing request', error);

            return {
                status: 500,
                jsonBody: { error: 'An unexpected error occurred. Please try again later.' },
            };
        }
    };
}