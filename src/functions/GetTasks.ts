import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos/client";
import { toErrorResponse } from "../http/errors";
import { badRequest, ok } from "../http/responses";
import { isValidUuid } from "../validation/task";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const organizationId = request.query.get('organizationId');

    if (!isValidUuid(organizationId)) {
        return badRequest("Query parameter 'organizationId' must be a valid UUID");
    }

    try {
        const container = await getTasksContainer();
        const { resources } = await container
            .items.query({
                query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
                parameters: [{ name: "@organizationId", value: organizationId }]
            })
            .fetchAll();
        return ok(resources);
    } catch (error) {
        return toErrorResponse(error, context);
    }
}

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'function',
    handler: GetTasks
});
