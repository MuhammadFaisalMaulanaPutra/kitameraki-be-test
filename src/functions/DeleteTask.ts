import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../services/cosmosClient";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const taskId = request.query.get("id");
        const organizationId = request.query.get("organizationId");

        if (!taskId || !organizationId) {
            return { status: 400, jsonBody: { error: "id and organizationId query parameters are required" } };
        }

        const container = getTasksContainer();
        await container.item(taskId, organizationId).delete();

        return { status: 204 };
    } catch (error: any) {
        if (error?.code === 404) {
            return { status: 404, jsonBody: { error: "Task not found" } };
        }
        context.error("DeleteTask failed", error);
        return { status: 500, jsonBody: { error: "Failed to delete task" } };
    }
}

app.http("DeleteTask", {
    methods: ["DELETE"],
    authLevel: "function",
    handler: DeleteTask,
});