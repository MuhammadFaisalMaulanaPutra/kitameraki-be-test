import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";
import client from "../config/Cosmos";
import { log } from "console";

export async function InsertForm(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const body = await request.json() as Record<string, any>
    const organizationId = body.organizationId;

    if (!organizationId) {
        return { jsonBody: { message: "Organization ID is required" }, status: 400 };
    }

    try {
        const maxOrderQuery = {
            query: "SELECT VALUE MAX(c.formOrder) FROM c WHERE c.organizationId = @orgId",
            parameters: [{ name: "@orgId", value: organizationId }]
        };

        const maxOrderResult = await client.database("TaskApp")
            .container("Form")
            .items.query(maxOrderQuery)
            .fetchNext();

        const nextOrder = (maxOrderResult.resources[0] || 0) + 1;

        context.log(`Next order: ${nextOrder}`);

        const form = {
            id: randomUUID(),
            formOrder: nextOrder,
            ...body
        }

        const createdForm = await client.database("TaskApp")
            .container("Form")
            .items.create(form);

        return { jsonBody: createdForm.resource, status: 200 };

    } catch (error: any) {
        return { jsonBody: { message: error.message }, status: 500 };
    }

}

app.http('InsertForm', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: InsertForm
})