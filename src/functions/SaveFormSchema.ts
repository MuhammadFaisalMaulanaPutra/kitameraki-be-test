import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function SaveFormSchema(request: HttpRequest, context: InvocationContext) {
    try {
        const body = await request.json() as object;
        const organizationId = request.query.get('organizationId');

        const client = new CosmosClient({
          endpoint: process.env.COSMOS_ENDPOINT!,
          key: process.env.COSMOS_KEY!,
        });

        await client.database(process.env.COSMOS_DATABASE!)
          .container(process.env.FORM_SCHEMA_CONTAINER!)
          .items.upsert(body)

        return {
            status: 200,
            jsonBody: { message: "Schema saved!" }
        };
    } catch (err) {
        return {
            status: 500,
            jsonBody: { error: err.message }
        };
    }
}

app.http('SaveFormSchema', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: SaveFormSchema
});
