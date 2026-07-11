import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { internalErrorResponse } from '../utils/response';

type FunctionHandler = (
  request: HttpRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

export function withErrorHandling(handler: FunctionHandler): FunctionHandler {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      return await handler(request, context);
    } catch (error) {
      context.log('Function error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return internalErrorResponse(message);
    }
  };
}
