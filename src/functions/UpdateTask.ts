import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { parseOrThrow, withErrorHandling } from "../lib/http";
import { taskParamsSchema, updateTaskSchema } from "../lib/taskSchema";
import { updateTask } from "../services/taskService";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const input = parseOrThrow(updateTaskSchema, await request.json());
    const params = parseOrThrow(taskParamsSchema, {
        id: request.params.id,
        organizationId: request.query.get('organizationId')
    });
    const task = await updateTask(params.id, params.organizationId, input);

    return { jsonBody: task, status: 200 };
};

app.http('UpdateTask', {
    methods: ['PATCH'],
    route: 'tasks/{id}',
    authLevel: 'anonymous',
    handler: withErrorHandling(UpdateTask)
});
