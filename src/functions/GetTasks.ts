import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);
        const organizationId = request.query.get('organizationId');

        const client = new CosmosClient({
            endpoint: process.env.COSMOS_ENDPOINT!,
            key: process.env.COSMOS_KEY!,
        });
        const task = await client.database(process.env.COSMOS_DATABASE!)
            .container(process.env.COSMOS_CONTAINER!)
            .items.query(`SELECT * FROM c WHERE c.organizationId = '${organizationId}'`)
            .fetchNext();

        return { jsonBody: task.resources, status: 200 };
    } catch (err) {
        return {
            status: 500,
            jsonBody: { error: err.message }
        };
    }
};

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTasks
});
