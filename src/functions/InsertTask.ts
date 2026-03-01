import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { randomUUID } from "node:crypto";
import { COSMOS_CONTAINER_NAME, ensureContainer } from "../config/cosmos";
import { ok, handleError, parseJson } from "../shared/http";
import { requireBodyObject, validateTaskCreate } from "../shared/validation";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await parseJson(request);
        const obj = requireBodyObject(body);
        const validated = validateTaskCreate(obj);

        const now = new Date().toISOString();
        const taskDocument = {
            ...validated,
            id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : randomUUID(),
            createdAt: now,
            updatedAt: now,
        };

        const container = await ensureContainer(COSMOS_CONTAINER_NAME);
        const createdTask = await container.items.create(taskDocument);

        return ok(createdTask.resource);
    } catch (error) {
        return handleError(context, error, "InsertTask");
    }
}

app.http('InsertTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: InsertTask
});
