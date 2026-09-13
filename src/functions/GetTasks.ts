import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getTasksContainer } from "../services/cosmosClient";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const organizationId = request.query.get("organizationId");
        if (!organizationId) {
            return { status: 400, jsonBody: { error: "organizationId query parameter is required" } };
        }

        const container = getTasksContainer();
        const { resources } = await container.items
            .query({
                query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
                parameters: [{ name: "@organizationId", value: organizationId }],
            })
            .fetchAll();

        return { status: 200, jsonBody: resources };
    } catch (error) {
        context.error("GetTasks failed", error);
        return { status: 500, jsonBody: { error: "Failed to fetch tasks" } };
    }
}

app.http("GetTasks", {
    methods: ["GET"],
    authLevel: "function",
    handler: GetTasks,
});