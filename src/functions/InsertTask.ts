import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";
import { getTasksContainer } from "../services/cosmosClient";
import { createTaskSchema } from "../schemas/task.schema";

export async function InsertTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const rawBody = await request.json();
        const parseResult = createTaskSchema.safeParse(rawBody);

        if (!parseResult.success) {
            const firstIssue = parseResult.error.issues[0];
            return {
                status: 400,
                jsonBody: {
                    error: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid task payload",
                    details: parseResult.error.flatten(),
                },
            };
        }

        const task = {
            id: randomUUID(),
            ...parseResult.data,
        };

        const container = getTasksContainer();
        const { resource } = await container.items.create(task);

        return { status: 201, jsonBody: resource };
    } catch (error) {
        context.error("InsertTask failed", error);
        return { status: 500, jsonBody: { error: "Failed to create task" } };
    }
}

app.http("InsertTask", {
    methods: ["POST"],
    authLevel: "function",
    handler: InsertTask,
});