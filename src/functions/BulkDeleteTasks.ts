import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const body = await request.json() as string[];
    const organizationId = request.query.get('organizationId');

    body.forEach(async element => {
        await tasksContainer.item(element, organizationId)
            .delete();
    });

    return { status: 200 };
};

app.http('BulkDeleteTasks', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: BulkDeleteTasks
});
