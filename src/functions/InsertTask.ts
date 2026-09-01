import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";
import { isFieldSettingsArray, normalizeTaskPayload } from "./payloads";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json();
        const organizationId = request.query.get("organizationId")?.trim() || null;
        const container = getTasksContainer();

        if (isFieldSettingsArray(body)) {
            if (!organizationId) {
                return {
                    status: 400,
                    jsonBody: { message: "Query parameter 'organizationId' is required when posting settings." }
                };
            }

            const now = new Date().toISOString();
            const settingsDocument = {
                id: `settings-${organizationId}`,
                organizationId,
                entityType: "settings",
                fields: body,
                updatedAt: now
            };

            const upsertedSettings = await container.items.upsert(settingsDocument);
            return { jsonBody: upsertedSettings.resource, status: 200 };
        }

        if (typeof body !== "object" || body === null || Array.isArray(body)) {
            return { status: 400, jsonBody: { message: "Request body must be a task object or settings array." } };
        }

        const normalizedTask = normalizeTaskPayload(body as Record<string, unknown>, organizationId);
        if (!normalizedTask) {
            return {
                status: 400,
                jsonBody: { message: "organizationId is required in query or body for task creation." }
            };
        }

        const now = new Date().toISOString();
        const incomingId = (body as Record<string, unknown>).id;
        const taskId = typeof incomingId === "string" && incomingId.trim()
            ? incomingId.trim()
            : crypto.randomUUID();

        const taskDocument = {
            id: taskId,
            entityType: "task",
            ...normalizedTask,
            createdAt: now,
            updatedAt: now
        };

        const createdTask = await container.items.create(taskDocument);
        return { jsonBody: createdTask.resource, status: 200 };
    } catch (error) {
        context.error("InsertTask failed", error);
        return { status: 500, jsonBody: { message: "Failed to create task.", error: (error as Error).message } };
    }
};

app.http('InsertTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: InsertTask
});
