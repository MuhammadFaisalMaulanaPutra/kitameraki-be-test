import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";
import { withErrorHandling } from "../lib/http";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const taskId = request.query.get('id');
    const organizationId = request.query.get('organizationId');

    const task = await tasksContainer.item(taskId, organizationId)
        .read();

    if (!task.resource) {
        return { jsonBody: { error: "Task not found." }, status: 404 };
    }

    return { jsonBody: task.resource, status: 200 };
};

app.http('GetTask', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: withErrorHandling(GetTask)
});
