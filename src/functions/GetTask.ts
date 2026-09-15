import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { getTask } from "../services/taskService";

export async function GetTask(
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

        const task = await getTask(taskId, organizationId);

        if (!task) {
            return {
                status: 404,
                jsonBody: {
                    message: "Task not found",
                },
            };
        }

        return {
            status: 200,
            jsonBody: task,
        };
    } catch (error) {
        context.error("Failed to get task", error);

        return {
            status: 500,
            jsonBody: {
                message: "Failed to retrieve task",
            },
        };
    }
}

app.http("GetTask", {
    methods: ["GET"],
    authLevel: "anonymous",
    handler: GetTask,
});