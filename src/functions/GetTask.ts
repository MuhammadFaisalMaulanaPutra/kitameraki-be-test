import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";
import { withErrorHandling } from "../lib/http";
import { taskParamsSchema } from "../lib/taskSchema";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const paramsResult = taskParamsSchema.safeParse({
        id: request.query.get('id'),
        organizationId: request.query.get('organizationId')
    });
    if (!paramsResult.success) {
        return { jsonBody: { errors: paramsResult.error.flatten() }, status: 400 };
    }

    const task = await tasksContainer.item(paramsResult.data.id, paramsResult.data.organizationId)
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
