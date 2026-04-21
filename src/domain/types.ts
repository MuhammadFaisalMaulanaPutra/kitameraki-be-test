import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { RequestContext } from "../context/request-context";

export interface QueryResult<T> {
    resources: T[];
    continuationToken?: string;
}

export interface BulkDeleteTaskResult {
    successIds: string[];
    failedIds: string[];
}

export type AuthenticatedHandler = (
    request: HttpRequest,
    context: InvocationContext,
    user: RequestContext
) => Promise<HttpResponseInit>