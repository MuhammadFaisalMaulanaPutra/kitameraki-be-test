import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../cosmos";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);
        const organizationId = request.query.get("organizationId");
        if (!organizationId) {
            return { status: 400, jsonBody: { message: "Query parameter 'organizationId' is required." } };
        }

        const tasks = await getTasksContainer().items
            .query({
                query: "SELECT * FROM c WHERE c.organizationId = @organizationId AND (c.entityType = @taskType OR NOT IS_DEFINED(c.entityType))",
                parameters: [
                    { name: "@organizationId", value: organizationId },
                    { name: "@taskType", value: "task" }
                ]
            })
            .fetchAll();

        return { jsonBody: tasks.resources, status: 200 };
    } catch (error) {
        context.error("GetTasks failed", error);
        return { status: 500, jsonBody: { message: "Failed to get tasks.", error: (error as Error).message } };
    }
};

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetTasks
});
