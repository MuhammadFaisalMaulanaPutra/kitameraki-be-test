import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ValidationError, DomainError, InvalidCredentialsError } from "../../domain/errors/domain-error";
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
        const origin = request.headers.get('origin');

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
                    requestId,
                    origin
                );
            }
            
            if (error instanceof InvalidCredentialsError) {
                context.warn(JSON.stringify({
                    event: 'Credential error',
                    message: error.message,
                    details: error.details
                }));

                return ApiResponseBuilder.error(
                    error.code,
                    error.message,
                    error.statusCode,
                    error.details,
                    requestId,
                    origin
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
                    requestId,
                    origin
                );
            }

            context.error(`Unexpected error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);

            return ApiResponseBuilder.error(
                'INTERNAL_ERROR',
                defaultErrorMessage,
                500,
                undefined,
                requestId,
                origin
            );
        }
    };
}