import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandling } from "../middleware/errorHandler";
import { requireUuidQueryParam, requireRouteParam } from "../utils/requestHelpers";
import * as taskService from "../services/taskService";

async function getTaskHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const taskId = requireRouteParam(request, 'id');
    const organizationId = requireUuidQueryParam(request, 'organizationId');

    const task = await taskService.getTask(taskId, organizationId);

    return { jsonBody: task, status: 200 };
}

export const GetTask = withErrorHandling(getTaskHandler);

app.http('GetTask', {
    route: 'tasks/{id}',
    methods: ['GET'],
    authLevel: 'function',
    handler: GetTask
});
