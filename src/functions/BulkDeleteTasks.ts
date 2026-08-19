import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandling } from "../middleware/errorHandler";
import { requireUuidQueryParam } from "../utils/requestHelpers";
import * as taskService from "../services/taskService";
import { BadRequestError } from "../utils/errors";

async function bulkDeleteTasksHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const organizationId = requireUuidQueryParam(request, 'organizationId');

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new BadRequestError('Request body must be valid JSON.');
    }

    const result = await taskService.bulkDeleteTasks(body, organizationId);

    return { jsonBody: result, status: 200 };
}

export const BulkDeleteTasks = withErrorHandling(bulkDeleteTasksHandler);

// Moved off DELETE-with-body (not well supported by all HTTP clients/
// proxies) onto a dedicated POST route, which is the more common
// convention for bulk operations.
app.http('BulkDeleteTasks', {
    route: 'tasks/bulk-delete',
    methods: ['POST'],
    authLevel: 'function',
    handler: BulkDeleteTasks
});
