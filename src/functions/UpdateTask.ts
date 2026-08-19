import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandling } from "../middleware/errorHandler";
import { requireUuidQueryParam, requireRouteParam } from "../utils/requestHelpers";
import * as taskService from "../services/taskService";
import { UpdateTaskInput } from "../models/task.types";
import { BadRequestError } from "../utils/errors";

async function updateTaskHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const taskId = requireRouteParam(request, 'id');
    const organizationId = requireUuidQueryParam(request, 'organizationId');

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new BadRequestError('Request body must be valid JSON.');
    }

    const updatedTask = await taskService.updateTask(taskId, organizationId, body as UpdateTaskInput);

    return { jsonBody: updatedTask, status: 200 };
}

export const UpdateTask = withErrorHandling(updateTaskHandler);

// Changed from POST -> PATCH: this endpoint applies a partial update,
// which PATCH communicates correctly per REST conventions. The id is
// now taken from the route (tasks/{id}) instead of a query parameter.
app.http('UpdateTask', {
    route: 'tasks/{id}',
    methods: ['PATCH'],
    authLevel: 'function',
    handler: UpdateTask
});
