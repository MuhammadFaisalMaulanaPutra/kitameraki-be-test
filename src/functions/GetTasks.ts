import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const organizationId = request.query.get('organizationId');

    const task = await tasksContainer.items
        .query({
            query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
            parameters: [{ name: "@organizationId", value: organizationId }]
        })
        .fetchNext();

    return { jsonBody: task.resources, status: 200 };
};

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTasks
});
