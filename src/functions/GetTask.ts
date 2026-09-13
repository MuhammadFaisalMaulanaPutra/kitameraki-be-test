import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../services/cosmosClient";

export async function GetTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const taskId = request.query.get("id");
        const organizationId = request.query.get("organizationId");

        if (!taskId || !organizationId) {
            return { status: 400, jsonBody: { error: "id and organizationId query parameters are required" } };
        }

        const container = getTasksContainer();
        const { resource } = await container.item(taskId, organizationId).read();

        if (!resource) {
            return { status: 404, jsonBody: { error: "Task not found" } };
        }

        return { status: 200, jsonBody: resource };
    } catch (error) {
        context.error("GetTask failed", error);
        return { status: 500, jsonBody: { error: "Failed to fetch task" } };
    }
}

app.http("GetTask", {
    methods: ["GET"],
    authLevel: "function",
    handler: GetTask,
});