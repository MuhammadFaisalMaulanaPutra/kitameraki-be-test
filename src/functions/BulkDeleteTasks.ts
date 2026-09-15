import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos/client";
import { badRequest, ok } from "../http/responses";
import { isValidUuid } from "../validation/task";

const MAX_BULK_DELETE_SIZE = 100;

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const organizationId = request.query.get('organizationId');
    if (!isValidUuid(organizationId)) {
        return badRequest("Query parameter 'organizationId' must be a valid UUID");
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return badRequest("Request body must be valid JSON");
    }

    if (!Array.isArray(body) || body.length === 0 || body.some((id) => typeof id !== "string")) {
        return badRequest("Request body must be a non-empty array of task id strings");
    }
    if (body.length > MAX_BULK_DELETE_SIZE) {
        return badRequest(`A maximum of ${MAX_BULK_DELETE_SIZE} task ids can be deleted per request`);
    }
    const invalidIds = body.filter((id) => !isValidUuid(id));
    if (invalidIds.length > 0) {
        return badRequest(`The following ids are not valid UUIDs: ${invalidIds.join(", ")}`);
    }

    const taskIds = body as string[];
    const container = await getTasksContainer();

    // Delete concurrently but independently: one task's failure must not
    // abort the rest, and the caller needs to know exactly what succeeded.
    const results = await Promise.allSettled(
        taskIds.map((taskId) => container.item(taskId, organizationId).delete())
    );

    const deleted: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    results.forEach((result, index) => {
        const taskId = taskIds[index];
        if (result.status === "fulfilled") {
            deleted.push(taskId);
            return;
        }

        const error = result.reason as { code?: number };
        if (error?.code === 404) {
            failed.push({ id: taskId, reason: "not found" });
        } else {
            context.error(`Failed to delete task ${taskId}`, result.reason);
            failed.push({ id: taskId, reason: "delete failed" });
        }
    });

    return ok({ deleted, failed });
}

app.http('BulkDeleteTasks', {
    methods: ['DELETE'],
    authLevel: 'function',
    handler: BulkDeleteTasks
});
