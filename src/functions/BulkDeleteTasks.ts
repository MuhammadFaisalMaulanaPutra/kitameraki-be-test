import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { deleteTask } from "../services/taskService";

export async function BulkDeleteTasks(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get("organizationId");

        if (!organizationId) {
            return {
                status: 400,
                jsonBody: {
                    message: "organizationId is required",
                },
            };
        }

        const body = await request.json();

        if (
            !Array.isArray(body) ||
            body.length === 0 ||
            !body.every((id) => typeof id === "string")
        ) {
            return {
                status: 400,
                jsonBody: {
                    message: "Request body must be a non-empty array of task IDs",
                },
            };
        }

        await Promise.all(
            body.map((taskId: string) =>
                deleteTask(taskId, organizationId)
            )
        );

        return {
            status: 204,
        };
    } catch (error) {
        context.error("Failed to bulk delete tasks", error);

        return {
            status: 500,
            jsonBody: {
                message: "Failed to delete tasks",
            },
        };
    }
}

app.http("BulkDeleteTasks", {
    methods: ["DELETE"],
    authLevel: "anonymous",
    handler: BulkDeleteTasks,
});