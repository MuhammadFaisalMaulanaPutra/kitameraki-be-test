import { PatchOperation } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos/client";
import { toErrorResponse } from "../http/errors";
import { badRequest, ok } from "../http/responses";
import { isValidUuid, validateTaskPatch } from "../validation/task";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const taskId = request.query.get('id');
    const organizationId = request.query.get('organizationId');

    if (!isValidUuid(taskId) || !isValidUuid(organizationId)) {
        return badRequest("Query parameters 'id' and 'organizationId' must be valid UUIDs");
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return badRequest("Request body must be valid JSON");
    }

    const { errors, patch } = validateTaskPatch(body);
    if (errors.length > 0) {
        return badRequest(errors);
    }

    // "set" adds the path when absent and overwrites it otherwise, so it
    // works for both previously-unset optional fields and existing ones.
    const patchOperations: PatchOperation[] = Object.entries(patch!).map(([key, value]) => ({
        op: "set",
        path: `/${key}`,
        value
    }));

    try {
        const container = await getTasksContainer();
        const { resource } = await container
            .item(taskId, organizationId)
            .patch(patchOperations);
        return ok(resource);
    } catch (error) {
        return toErrorResponse(error, context);
    }
}

app.http('UpdateTask', {
    methods: ['POST'],
    authLevel: 'function',
    handler: UpdateTask
});
