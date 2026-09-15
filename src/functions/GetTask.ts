import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos/client";
import { toErrorResponse } from "../http/errors";
import { badRequest, notFound, ok } from "../http/responses";
import { isValidUuid } from "../validation/task";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const taskId = request.query.get('id');
    const organizationId = request.query.get('organizationId');

    if (!isValidUuid(taskId) || !isValidUuid(organizationId)) {
        return badRequest("Query parameters 'id' and 'organizationId' must be valid UUIDs");
    }

    try {
        const container = await getTasksContainer();
        const { resource } = await container.item(taskId, organizationId).read();
        if (!resource) {
            return notFound();
        }
        return ok(resource);
    } catch (error) {
        return toErrorResponse(error, context);
    }
}

app.http('GetTask', {
    methods: ['GET'],
    authLevel: 'function',
    handler: GetTask
});
