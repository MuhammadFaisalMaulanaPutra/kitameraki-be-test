import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { RequestContext } from "../context/request-context";
import { authMiddleware } from "./auth-middleware";
import { AuthenticatedHandler } from "../domain/types";

export function withAuth(
    handler: AuthenticatedHandler
) {
    return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        const result = await authMiddleware(request, context);
        
        if ("status" in result) {
            return result;
        }

        return handler(request, context, result as RequestContext);
    }
}