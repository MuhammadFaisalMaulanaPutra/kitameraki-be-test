import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { RequestContext } from "../context/request-context";
import { UnauthorizedError } from "../domain/errors/domain-error";
import { ApiResponseBuilder } from "../infrastructure/http/response";
import { verifyToken } from "../utils/jwt";

export async function authMiddleware(request: HttpRequest, context: InvocationContext): Promise<RequestContext | HttpResponseInit> {
    const authHeader = request.headers.get('Authorization');
    const requestId = request.headers.get('x-request-id') || context.invocationId;

    if (!authHeader || !authHeader.startsWith('Bearer '))
        throw new UnauthorizedError();

    try {
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        console.log(`payload: ${JSON.stringify(payload, null, 2)}`)
        const requestContext: RequestContext = {
            userId: payload.sub,
            organizationId: payload.organizationId
        }

        return requestContext;
    } catch (error) {
        return ApiResponseBuilder.error("INVALID_TOKEN", "Invalid token", 401, undefined, requestId);
    }
}