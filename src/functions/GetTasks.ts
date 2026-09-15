import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { getTasks } from "../services/taskService";

export async function GetTasks(
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

        const tasks = await getTasks(organizationId);

        return {
            status: 200,
            jsonBody: tasks,
        };
    } catch (error) {
        context.error("Failed to get tasks", error);

        return {
            status: 500,
            jsonBody: {
                message: "Failed to retrieve tasks",
            },
        };
    }
}

app.http("GetTasks", {
    methods: ["GET"],
    authLevel: "anonymous",
    handler: GetTasks,
});