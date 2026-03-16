import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);

        const taskId = request.query.get('id');
        const organizationId = request.query.get('organizationId');

        const client = new CosmosClient({
            endpoint: process.env.COSMOS_ENDPOINT!,
            key: process.env.COSMOS_KEY!,
        });
        await client.database(process.env.COSMOS_DATABASE!)
            .container(process.env.COSMOS_CONTAINER!)
            .item(taskId, organizationId)
            .delete();

        return { status: 200 };
    } catch (err) {
        return {
            status: 500,
            jsonBody: { error: err.message }
        };
    }
};

app.http('DeleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: DeleteTask
});
