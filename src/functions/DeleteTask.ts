import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandling } from "../middleware/errorHandler";
import { requireUuidQueryParam, requireRouteParam } from "../utils/requestHelpers";
import * as taskService from "../services/taskService";

async function deleteTaskHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const taskId = requireRouteParam(request, 'id');
    const organizationId = requireUuidQueryParam(request, 'organizationId');

    await taskService.deleteTask(taskId, organizationId);

    return { status: 204 };
}

export const DeleteTask = withErrorHandling(deleteTaskHandler);

app.http('DeleteTask', {
    route: 'tasks/{id}',
    methods: ['DELETE'],
    authLevel: 'function',
    handler: DeleteTask
});
