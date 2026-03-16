import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function TestConnection(request: HttpRequest, context: InvocationContext) {
    try {
        const client = new CosmosClient({
          endpoint: process.env.COSMOS_ENDPOINT!,
          key: process.env.COSMOS_KEY!,
        });

        await client.getDatabaseAccount();

        return {
            status: 200,
            jsonBody: { message: "Cosmos connection OK" }
        };
    } catch (err) {
        return {
            status: 500,
            jsonBody: { error: err.message }
        };
    }
}

app.http('TestConnection', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: TestConnection
});
