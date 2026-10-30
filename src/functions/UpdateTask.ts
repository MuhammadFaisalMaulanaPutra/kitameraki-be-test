import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tasksContainer } from "../lib/cosmos";
import { withErrorHandling } from "../lib/http";
import { updateTaskParamsSchema, updateTaskSchema } from "../lib/taskSchema";

export async function UpdateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const bodyResult = updateTaskSchema.safeParse(await request.json());
    if (!bodyResult.success) {
        return { jsonBody: { errors: bodyResult.error.flatten() }, status: 400 };
    }

    const paramsResult = updateTaskParamsSchema.safeParse({
        id: request.query.get('id'),
        organizationId: request.query.get('organizationId')
    });
    if (!paramsResult.success) {
        return { jsonBody: { errors: paramsResult.error.flatten() }, status: 400 };
    }

    const patchRequests = Object.entries(bodyResult.data).map(([key, value]) => ({
        op: "set" as const,
        path: `/${key}`,
        value
    }));

    const createdTask = await tasksContainer.item(paramsResult.data.id, paramsResult.data.organizationId)
        .patch(patchRequests);

    return { jsonBody: createdTask.resource, status: 200 };
};

app.http('UpdateTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: withErrorHandling(UpdateTask)
});
