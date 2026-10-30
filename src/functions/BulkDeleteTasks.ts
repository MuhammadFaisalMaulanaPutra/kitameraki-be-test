import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const body = await request.json();
    const organizationId = request.query.get('organizationId');

    if (!Array.isArray(body) || body.length > 100 || !body.every(id => typeof id === "string")) {
        return { jsonBody: { error: "Task ids must be an array of at most 100 strings." }, status: 400 };
    }

    await Promise.all(body.map(id => tasksContainer.item(id, organizationId).delete()));
    return { status: 200 };
};

app.http('BulkDeleteTasks', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: BulkDeleteTasks
});
