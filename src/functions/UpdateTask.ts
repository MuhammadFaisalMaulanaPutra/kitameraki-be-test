import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { COSMOS_CONTAINER_NAME, ensureContainer } from "../config/cosmos";
import { ok, handleError, parseJson, HttpError } from "../shared/http";
import { requireQuery, requireBodyObject, forbidImmutableFields } from "../shared/validation";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const taskId = requireQuery(request, "id");
        const organizationId = requireQuery(request, "organizationId");

        const body = await parseJson(request);
        const obj = requireBodyObject(body);

        forbidImmutableFields(obj, ["id", "organizationId", "createdAt"]);

        const patchRequests: any[] = [];
        for (const key of Object.keys(obj)) {
            patchRequests.push({
                op: "replace",
                path: `/${key}`,
                value: obj[key]
            });
        }

        if (patchRequests.length === 0) {
            throw new HttpError(400, "Request body must include at least one property to update");
        }

        patchRequests.push({
            op: "replace",
            path: "/updatedAt",
            value: new Date().toISOString()
        });

        const container = await ensureContainer(COSMOS_CONTAINER_NAME);
        const updatedTask = await container.item(taskId, organizationId).patch(patchRequests);

        return ok(updatedTask.resource);
    } catch (error) {
        return handleError(context, error, "UpdateTask");
    }
}

app.http('UpdateTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: UpdateTask
});
