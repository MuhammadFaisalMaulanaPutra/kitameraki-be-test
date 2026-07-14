import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import client from "../config/Cosmos";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const taskId = request.params.id;
    const organizationId = request.query.get('organizationId');

    try {
        const task = await client.database("TaskApp")
            .container("Tasks")
            .item(taskId, organizationId)
            .read();

        return { jsonBody: task.resource, status: 200 };
    } catch (error: any) {
        return { jsonBody: { message: error.message }, status: 500 };
    }
};

app.http('GetTask', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'GetTask/{id}',
    handler: GetTask
});
