import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos/client";
import { toErrorResponse } from "../http/errors";
import { badRequest, noContent } from "../http/responses";
import { isValidUuid } from "../validation/task";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const taskId = request.query.get('id');
    const organizationId = request.query.get('organizationId');

    if (!isValidUuid(taskId) || !isValidUuid(organizationId)) {
        return badRequest("Query parameters 'id' and 'organizationId' must be valid UUIDs");
    }

    try {
        const container = await getTasksContainer();
        await container.item(taskId, organizationId).delete();
        return noContent();
    } catch (error) {
        return toErrorResponse(error, context);
    }
}

app.http('DeleteTask', {
    methods: ['DELETE'],
    authLevel: 'function',
    handler: DeleteTask
});
