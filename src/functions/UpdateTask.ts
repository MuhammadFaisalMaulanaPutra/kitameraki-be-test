import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";


export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as Record<string, unknown>;
        const taskId = request.query.get("id");
        const organizationId = request.query.get("organizationId");

        if (!taskId || !organizationId) {
            return { status: 400, jsonBody: { message: "Query parameters 'id' and 'organizationId' are required." } };
        }

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return { status: 400, jsonBody: { message: "Request body must be an object." } };
        }

        const patchRequests = Object.keys(body).map((key) => ({
            op: "set" as const,
            path: `/${key}`,
            value: body[key]
        }));

        patchRequests.push({
            op: "set" as const,
            path: "/updatedAt",
            value: new Date().toISOString()
        });

        const updatedTask = await getTasksContainer()
            .item(taskId, organizationId)
            .patch(patchRequests);

        return { jsonBody: updatedTask.resource, status: 200 };
    } catch (error) {
        context.error("UpdateTask failed", error);
        return { status: 500, jsonBody: { message: "Failed to update task.", error: (error as Error).message } };
    }
};

app.http('UpdateTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: UpdateTask
});
