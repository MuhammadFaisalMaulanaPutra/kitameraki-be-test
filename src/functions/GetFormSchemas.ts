import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function GetFormSchemas(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);
        const organizationId = request.query.get('organizationId');

        const client = new CosmosClient({
            endpoint: process.env.COSMOS_ENDPOINT!,
            key: process.env.COSMOS_KEY!,
        });

        let query = "SELECT * FROM c WHERE c.organizationId = @organizationId";

        const parameters: any[] = [
          { name: "@organizationId", value: organizationId }
        ];

        const container = client
          .database(process.env.COSMOS_DATABASE!)
          .container(process.env.FORM_SCHEMA_CONTAINER!);

        const task = await container.items
          .query({ query, parameters })
          .fetchNext();

        return { jsonBody: task.resources[0], status: 200 };
    } catch (err) {
        return {
            status: 500,
            jsonBody: { error: err.message }
        };
    }
};

app.http('GetFormSchemas', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetFormSchemas
});
