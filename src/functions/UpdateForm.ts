import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import client from "../config/Cosmos";
import { PatchOperation } from "@azure/cosmos";

export async function updateForm(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const body = await request.json() as Record<string, any>;
    const formId = request.params.id;
    const organizationId = body.organizationId;

    if (!formId) {
        return { jsonBody: { message: "Form ID is required" }, status: 400 }
    }

    if (!organizationId) {
        return { jsonBody: { message: "Organization ID is required" }, status: 400 }
    }

    try {
        const patchRequests: PatchOperation[] = Object.entries(body)
            .filter(([key]) => key !== "id")
            .map(([key, value]) => ({
                op: "replace",
                path: `/${key}`,
                value
            }));

        const updatedTask = await client
            .database("TaskApp")
            .container("Form")
            .item(formId, organizationId)
            .patch(patchRequests);

        return { jsonBody: updatedTask.resource, status: 200 };
    } catch (error: any) {
        if (error.code === 404 || error.statusCode === 404) {
            return { jsonBody: { message: "Task not found" }, status: 404 };
        }

        return { jsonBody: { message: error.message }, status: 500 };
    }
}

app.http('UpdateForm', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'UpdateForm/{id}',
    handler: updateForm
});