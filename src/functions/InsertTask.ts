import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandling } from "../middleware/errorHandler";
import { requireUuidQueryParam } from "../utils/requestHelpers";
import * as taskService from "../services/taskService";
import { CreateTaskInput } from "../models/task.types";
import { BadRequestError } from "../utils/errors";

async function insertTaskHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    // TODO: once real authentication is in place, derive organizationId
    // from the authenticated caller's context instead of trusting a
    // client-supplied query parameter.
    const organizationId = requireUuidQueryParam(request, 'organizationId');

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new BadRequestError('Request body must be valid JSON.');
    }

    const createdTask = await taskService.createTask(organizationId, body as CreateTaskInput);

    return { jsonBody: createdTask, status: 201 };
}

export const InsertTask = withErrorHandling(insertTaskHandler);

app.http('InsertTask', {
    route: 'tasks',
    methods: ['POST'],
    authLevel: 'function',
    handler: InsertTask
});
