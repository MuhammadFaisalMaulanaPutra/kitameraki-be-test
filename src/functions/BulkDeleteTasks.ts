import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { tasksContainer } from "../lib/cosmos";
import { withErrorHandling } from "../lib/http";
import { bulkDeleteSchema, uuidSchema } from "../lib/taskSchema";

export async function BulkDeleteTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const bodyResult = bulkDeleteSchema.safeParse(await request.json());
    if (!bodyResult.success) {
        return { jsonBody: { errors: z.flattenError(bodyResult.error) }, status: 400 };
    }

    const organizationResult = uuidSchema.safeParse(request.query.get('organizationId'));
    if (!organizationResult.success) {
        return { jsonBody: { errors: z.flattenError(organizationResult.error) }, status: 400 };
    }

    const batchResult = await tasksContainer.items.batch(
        bodyResult.data.map(id => ({ operationType: "Delete", id })),
        organizationResult.data
    );

    if (!batchResult.result) {
        throw new Error("Cosmos batch returned no operation results.");
    }

    const failedOperation = batchResult.result.find(operation => operation.statusCode >= 400);

    if (failedOperation) {
        return { status: failedOperation.statusCode === 409 ? 409 : 404 };
    }

    return { status: 200 };
};

app.http('BulkDeleteTasks', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: withErrorHandling(BulkDeleteTasks)
});
