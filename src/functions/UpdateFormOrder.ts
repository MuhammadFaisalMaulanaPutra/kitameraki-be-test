import { PatchOperation } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import client from "../config/Cosmos";

export async function updateFormOrder(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const body = await request.json() as Record<string, any>;
    const formId = request.params.id;
    const organizationId = body.organizationId;
    if (!organizationId) {
        return { jsonBody: { message: "Organization ID is required" }, status: 400 }
    }

    if (!formId) {
        return { jsonBody: { message: "Form ID is required" }, status: 400 }
    }


    const orderIds: string[] = body.orderIds;
    try {

        const results = await Promise.all(
            orderIds.map((id, index) => {
                return client
                    .database("TaskApp")
                    .container("Form")
                    .item(id, organizationId)
                    .patch([{ op: "replace", path: "/order", value: index + 1 }]);
            })
        );

        return {
            jsonBody: {
                message: "Form order updated",
                updatedCount: results.length,
                updatedIds: orderIds
            },
            status: 200
        };

    } catch (error: any) {
        if (error.code === 404 || error.statusCode === 404) {
            return { jsonBody: { message: "Task not found" }, status: 404 };
        }

        return { jsonBody: { message: error.message }, status: 500 };
    }
}

app.http('UpdateFormOrder', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'UpdateFormOrder/{id}',
    handler: updateFormOrder
});