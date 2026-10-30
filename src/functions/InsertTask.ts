import { randomUUID } from "node:crypto";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";
import { createTaskSchema } from "../lib/taskSchema";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const result = createTaskSchema.safeParse(await request.json());

    if (!result.success) {
        return { jsonBody: { errors: result.error.flatten() }, status: 400 };
    }

    const createdTask = await tasksContainer.items.create({ id: randomUUID(), ...result.data });

    return { jsonBody: createdTask.resource, status: 200 };
};

app.http('InsertTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: InsertTask
});
