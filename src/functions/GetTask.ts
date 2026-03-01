import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { COSMOS_CONTAINER_NAME, ensureContainer } from "../config/cosmos";
import { ok, handleError, HttpError } from "../shared/http";
import { requireQuery } from "../shared/validation";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const taskId = requireQuery(request, "id");
        const organizationId = requireQuery(request, "organizationId");

        const container = await ensureContainer(COSMOS_CONTAINER_NAME);
        try {
            const task = await container.item(taskId, organizationId).read();
            if (task.statusCode === 404) {
                throw new HttpError(404, "Task not found");
            }
            return ok(task.resource ?? null);
        } catch (err: any) {
            if (err.code === 404) throw new HttpError(404, "Task not found");
            throw err;
        }
    } catch (error) {
        return handleError(context, error, "GetTask");
    }
}

app.http('GetTask', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTask
});
