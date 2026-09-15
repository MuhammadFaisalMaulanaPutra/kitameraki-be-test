import { HttpResponseInit, InvocationContext } from "@azure/functions";
import { conflict, notFound, serverError } from "./responses";

interface CosmosErrorLike {
    code?: number;
    message?: string;
}

// Cosmos SDK errors carry an HTTP-like `code`. Map the ones callers can act
// on to proper responses and treat everything else as an opaque server
// error so internal details are never leaked to clients.
export function toErrorResponse(error: unknown, context: InvocationContext): HttpResponseInit {
    const cosmosError = error as CosmosErrorLike;

    if (cosmosError?.code === 404) {
        return notFound();
    }
    if (cosmosError?.code === 409) {
        return conflict("A task with this id already exists in the organization");
    }

    context.error("Unhandled error while processing request", error);
    return serverError();
}
