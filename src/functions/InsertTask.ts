import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json();
        const createdTask = await getTasksContainer().items.create(body);
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
