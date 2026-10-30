import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { parseOrThrow, withErrorHandling } from "../lib/http";
import { taskListQuerySchema } from "../lib/taskSchema";
import { getTasks } from "../services/taskService";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const query = parseOrThrow(taskListQuerySchema, {
        organizationId: request.query.get('organizationId'),
        search: request.query.get('search') ?? undefined,
        status: request.query.get('status') ?? undefined,
        priority: request.query.get('priority') ?? undefined,
        page: request.query.get('page') ?? undefined,
        pageSize: request.query.get('pageSize') ?? undefined
    });
    const tasks = await getTasks(query);

    return { jsonBody: tasks, status: 200 };
};

app.http('GetTasks', {
    methods: ['GET'],
    route: 'tasks',
    authLevel: 'anonymous',
    handler: withErrorHandling(GetTasks)
});
