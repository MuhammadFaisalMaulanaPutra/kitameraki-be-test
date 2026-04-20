import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ValidationError, DomainError } from "../../domain/errors/DomainError";
import { ApiResponseBuilder } from "./response";

export type HttpHandlerFunction = (
    request: HttpRequest,
    context: InvocationContext
) => Promise<HttpResponseInit>;

export function withErrorHandling(
    handler: HttpHandlerFunction,
    defaultErrorMessage: string = 'An unexpected error occurred'
): HttpHandlerFunction {
    return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        const requestId = request.headers.get('x-request-id') || context.invocationId;

        try {
            return await handler(request, context);
        } catch (error) {
            if (error instanceof ValidationError) {
                context.warn(JSON.stringify({
                    event: 'Validation error',
                    message: error.message,
                    details: error.details
                }));

                return ApiResponseBuilder.error(
                    error.code,
                    error.message,
                    error.statusCode,
                    error.details,
                    requestId
                );
            }

            if (error instanceof DomainError) {
                context.warn(JSON.stringify({
                    event: 'Domain error',
                    code: error.code,
                    message: error.message
                }));

                return ApiResponseBuilder.error(
                    error.code,
                    error.message,
                    error.statusCode,
                    error.details,
                    requestId
                );
            }

            context.error(`Unexpected error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);

            return ApiResponseBuilder.error(
                'INTERNAL_ERROR',
                defaultErrorMessage,
                500,
                undefined,
                requestId
            );
        }
    };
}