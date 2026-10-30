import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";
import { withErrorHandling } from "../lib/http";
import { taskParamsSchema } from "../lib/taskSchema";

export async function DeleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const paramsResult = taskParamsSchema.safeParse({
        id: request.query.get('id'),
        organizationId: request.query.get('organizationId')
    });
    if (!paramsResult.success) {
        return { jsonBody: { errors: paramsResult.error.flatten() }, status: 400 };
    }

    await tasksContainer.item(paramsResult.data.id, paramsResult.data.organizationId)
        .delete();

    return { status: 200 };
};

app.http('DeleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: withErrorHandling(DeleteTask)
});
