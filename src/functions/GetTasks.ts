import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { tasksContainer } from "../lib/cosmos";
import { withErrorHandling } from "../lib/http";
import { uuidSchema } from "../lib/taskSchema";

export async function GetTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const organizationResult = uuidSchema.safeParse(request.query.get('organizationId'));
    if (!organizationResult.success) {
        return { jsonBody: { errors: z.flattenError(organizationResult.error) }, status: 400 };
    }

    const task = await tasksContainer.items
        .query({
            query: "SELECT * FROM c WHERE c.organizationId = @organizationId",
            parameters: [{ name: "@organizationId", value: organizationResult.data }]
        })
        .fetchNext();

    return { jsonBody: task.resources, status: 200 };
};

app.http('GetTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: withErrorHandling(GetTasks)
});
