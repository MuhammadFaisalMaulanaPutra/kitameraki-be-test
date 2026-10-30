import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { parseOrThrow, withErrorHandling } from "../lib/http";
import { organizationParamsSchema } from "../lib/taskSchema";
import { getTasks } from "../services/taskService";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const params = parseOrThrow(organizationParamsSchema, {
        organizationId: request.query.get('organizationId')
    });
    const tasks = await getTasks(params.organizationId);

    return { jsonBody: tasks, status: 200 };
};

app.http('GetTasks', {
    methods: ['GET'],
    route: 'tasks',
    authLevel: 'anonymous',
    handler: withErrorHandling(GetTasks)
});
