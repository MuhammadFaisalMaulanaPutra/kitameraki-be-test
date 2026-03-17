import { CosmosClient } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);
        const organizationId = request.query.get('organizationId');
        const title = request.query.get("title");
        const status = request.query.get("status");
        const dueDate = request.query.get("dueDate");

        const client = new CosmosClient({
            endpoint: process.env.COSMOS_ENDPOINT!,
            key: process.env.COSMOS_KEY!,
        });
        let query = "SELECT * FROM c WHERE c.organizationId = @organizationId";

        const parameters: any[] = [
          { name: "@organizationId", value: organizationId }
        ];

        if (title) {
          query += " AND CONTAINS(LOWER(c.title), LOWER(@title))";
          parameters.push({ name: "@title", value: title });
        }
        if (status) {
          query += " AND c.status = @status";
          parameters.push({ name: "@status", value: status });
        }
        if (dueDate) {
          query += " AND c.dueDate <= @dueDate";
          parameters.push({ name: "@dueDate", value: dueDate });
        }
        const task = await client.database(process.env.COSMOS_DATABASE!)
            .container(process.env.COSMOS_CONTAINER!)
            .items.query({
              query,
              parameters
            })
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
