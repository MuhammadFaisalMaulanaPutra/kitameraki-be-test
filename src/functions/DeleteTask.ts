import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { deleteTask } from "../services/taskService";

export async function DeleteTask(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const taskId = request.query.get("id");
        const organizationId = request.query.get("organizationId");

        if (!taskId || !organizationId) {
            return {
                status: 400,
                jsonBody: {
                    message: "id and organizationId are required",
                },
            };
        }

        const deleted = await deleteTask(taskId, organizationId);

        if (!deleted) {
            return {
                status: 404,
                jsonBody: {
                    message: "Task not found",
                },
            };
        }

        return {
            status: 204,
        };
    } catch (error) {
        context.error("Failed to delete task", error);

        return {
            status: 500,
            jsonBody: {
                message: "Failed to delete task",
            },
        };
    }
}

app.http("DeleteTask", {
    methods: ["DELETE"],
    authLevel: "anonymous",
    handler: DeleteTask,
});
