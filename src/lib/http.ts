import { HttpHandler } from "@azure/functions";

function getStatusCode(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }

    const { code, statusCode } = error as { code?: unknown; statusCode?: unknown };
    const value = typeof statusCode === "number" ? statusCode : code;
    return typeof value === "number" ? value : undefined;
}

export function withErrorHandling(handler: HttpHandler): HttpHandler {
    return async (request, context) => {
        try {
            return await handler(request, context);
        } catch (error) {
            if (error instanceof SyntaxError) {
                return { jsonBody: { error: "Invalid JSON body." }, status: 400 };
            }

            const status = getStatusCode(error);
            if (status === 404 || status === 409) {
                return {
                    jsonBody: { error: status === 404 ? "Resource not found." : "Conflict." },
                    status
                };
            }

            context.error(error);
            return { jsonBody: { error: "Internal server error." }, status: 500 };
        }
    };
}
