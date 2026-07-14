import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import client from "../config/Cosmos";
import { SqlQuerySpec } from "@azure/cosmos";

export async function GetForms(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const organizationId = request.params.organizationId;

    if (!organizationId) {
        return { jsonBody: { message: "Organization ID is required" }, status: 400 }
    }


    try {
        const querySpec: SqlQuerySpec = {
            query: "SELECT * FROM c WHERE c.organizationId = @orgId",
            parameters: [
                { name: "@orgId", value: organizationId }
            ]
        };

        const forms = await client.database("TaskApp")
            .container("Form")
            .items.query(querySpec)
            .fetchAll();

        return { jsonBody: forms.resources, status: 200 };

    } catch (error: any) {
        return { jsonBody: { message: error.message }, status: 500 };
    }
}

app.http('GetForms', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'GetForms/{organizationId}',
    handler: GetForms
})