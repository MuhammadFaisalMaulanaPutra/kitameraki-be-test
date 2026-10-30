import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { parseOrThrow, withErrorHandling } from "../lib/http";
import { taskParamsSchema } from "../lib/taskSchema";
import { deleteTask } from "../services/taskService";

export async function DeleteTask(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const params = parseOrThrow(taskParamsSchema, {
        id: request.params.id,
        organizationId: request.query.get("organizationId")
    });
    await deleteTask(params.id, params.organizationId);

    return { status: 204 };
}

app.http("DeleteTask", {
    methods: ["DELETE"],
    route: "tasks/{id}",
    authLevel: "anonymous",
    handler: withErrorHandling(DeleteTask)
});
