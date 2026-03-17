import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";


export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as object;
        const taskId = request.query.get('id');
        const organizationId = request.query.get('organizationId');

        let patchRequests = [];

        for (let key in body) {
            patchRequests.push({
                "op": "set",
                "path": `/${key}`,
                "value": body[key]
            });
        }

        const client = new CosmosClient({
          endpoint: process.env.COSMOS_ENDPOINT!,
          key: process.env.COSMOS_KEY!,
        });
        const createdTask = await client.database(process.env.COSMOS_DATABASE!)
            .container(process.env.COSMOS_CONTAINER!)
            .item(taskId, organizationId)
            .patch(patchRequests);

        return { jsonBody: createdTask.resource, status: 200 };
    } catch (err) {
        return {
            status: 500,
            jsonBody: { error: err.message }
        };
    }
};

app.http('UpdateTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: UpdateTask
});
