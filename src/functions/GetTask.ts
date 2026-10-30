import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { HttpError, parseOrThrow, withErrorHandling } from "../lib/http";
import { taskParamsSchema } from "../lib/taskSchema";
import { getTask } from "../services/taskService";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const params = parseOrThrow(taskParamsSchema, {
        id: request.params.id,
        organizationId: request.query.get('organizationId')
    });
    const task = await getTask(params.id, params.organizationId);

    if (!task) {
        throw new HttpError(404, "NOT_FOUND", "Resource not found.");
    }

    return { jsonBody: task, status: 200 };
};

app.http('GetTask', {
    methods: ['GET'],
    route: 'tasks/{id}',
    authLevel: 'anonymous',
    handler: withErrorHandling(GetTask)
});
