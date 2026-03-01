import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { COSMOS_CONTAINER_NAME, ensureContainer } from "../config/cosmos";
import { handleError, noContent } from "../shared/http";
import { requireQuery } from "../shared/validation";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const taskId = requireQuery(request, "id");
        const organizationId = requireQuery(request, "organizationId");

        const container = await ensureContainer(COSMOS_CONTAINER_NAME);
        await container.item(taskId, organizationId).delete();

        return noContent();
    } catch (error) {
        return handleError(context, error, "DeleteTask");
    }
}

app.http('DeleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: DeleteTask
});
