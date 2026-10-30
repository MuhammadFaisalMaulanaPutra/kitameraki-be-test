import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { parseOrThrow, withErrorHandling } from "../lib/http";
import { createTaskSchema } from "../lib/taskSchema";
import { createTask } from "../services/taskService";

export async function InsertTask(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const input = parseOrThrow(createTaskSchema, await request.json());
    const task = await createTask(input);

    return { jsonBody: task, status: 201 };
}

app.http("InsertTask", {
    methods: ["POST"],
    route: "tasks",
    authLevel: "anonymous",
    handler: withErrorHandling(InsertTask)
});
