import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos/client";
import { toErrorResponse } from "../http/errors";
import { badRequest, created } from "../http/responses";
import { validateNewTask } from "../validation/task";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return badRequest("Request body must be valid JSON");
    }

    const { errors, task } = validateNewTask(body);
    if (errors.length > 0) {
        return badRequest(errors);
    }

    try {
        const container = await getTasksContainer();
        const { resource } = await container.items.create(task!);
        return created(resource);
    } catch (error) {
        return toErrorResponse(error, context);
    }
}

app.http('InsertTask', {
    methods: ['POST'],
    authLevel: 'function',
    handler: InsertTask
});
