import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../services/cosmosClient";
import { updateTaskSchema } from "../schemas/task.schema";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const taskId = request.query.get("id");
        const organizationId = request.query.get("organizationId");

        if (!taskId || !organizationId) {
            return { status: 400, jsonBody: { error: "id and organizationId query parameters are required" } };
        }

        const rawBody = await request.json();
        const parseResult = updateTaskSchema.safeParse(rawBody);

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

        const container = getTasksContainer();

        const { resource: existingTask } = await container.item(taskId, organizationId).read();
        if (!existingTask) {
            return { status: 404, jsonBody: { error: "Task not found" } };
        }

        const updatedTask = {
            ...existingTask,
            ...parseResult.data,
        };

        const { resource } = await container.item(taskId, organizationId).replace(updatedTask);

        return { status: 200, jsonBody: resource };
    } catch (error: any) {
        if (error?.code === 404) {
            return { status: 404, jsonBody: { error: "Task not found" } };
        }
        context.error("UpdateTask failed", error);
        return { status: 500, jsonBody: { error: "Failed to update task" } };
    }
}

app.http("UpdateTask", {
    methods: ["PATCH"],
    authLevel: "function",
    handler: UpdateTask,
});