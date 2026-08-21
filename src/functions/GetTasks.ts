import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { client, databaseId, containerId } from "../shared/cosmos";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get('organizationId');
        if (!organizationId) {
            return { status: 400, body: "Missing organizationId parameter." };
        }

        const querySpec = {
            query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
            parameters: [
                { name: "@organizationId", value: organizationId }
            ]
        };

        const { resources } = await client.database(databaseId)
            .container(containerId)
            .items.query(querySpec)
            .fetchAll();

        return { jsonBody: resources, status: 200 };
    } catch (error) {
        context.error("Error fetching tasks:", error);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTasks
});
