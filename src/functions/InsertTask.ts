import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";
import client from "../config/Cosmos";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const body = (await request.json() as Record<string, unknown>);

    if (!body.organizationId) {
        return { jsonBody: { message: "Organization ID is required" }, status: 400 };
    }

    const task = {
        id: randomUUID(),
        ...body
    }

    try {
        const createdTask = await client.database("TaskApp")
            .container("Tasks")
            .items.create(task);

        return { jsonBody: createdTask.resource, status: 200 };

    } catch (error: any) {
        return { jsonBody: { message: error.message }, status: 500 };
    }
};

app.http('InsertTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: InsertTask
});
