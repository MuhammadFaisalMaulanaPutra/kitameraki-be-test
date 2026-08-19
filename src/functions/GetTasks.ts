import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandling } from "../middleware/errorHandler";
import { requireUuidQueryParam, parsePositiveIntOrDefault } from "../utils/requestHelpers";
import * as taskService from "../services/taskService";
import { TaskPriority, TaskStatus } from "../models/task.types";
import { BadRequestError } from "../utils/errors";

const VALID_STATUSES: TaskStatus[] = ["todo", "in-progress", "completed"];
const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

function parseStatus(raw: string | null): TaskStatus | undefined {
    if (!raw) return undefined;
    if (!VALID_STATUSES.includes(raw as TaskStatus)) {
        throw new BadRequestError(`Query parameter "status" must be one of: ${VALID_STATUSES.join(", ")}.`);
    }
    return raw as TaskStatus;
}

function parsePriority(raw: string | null): TaskPriority | undefined {
    if (!raw) return undefined;
    if (!VALID_PRIORITIES.includes(raw as TaskPriority)) {
        throw new BadRequestError(`Query parameter "priority" must be one of: ${VALID_PRIORITIES.join(", ")}.`);
    }
    return raw as TaskPriority;
}

async function getTasksHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    // TODO: once real authentication is in place, derive organizationId
    // from the authenticated caller's context instead of trusting a
    // client-supplied query parameter.
    const organizationId = requireUuidQueryParam(request, 'organizationId');

    const result = await taskService.listTasks({
        organizationId,
        search: request.query.get('search') ?? undefined,
        status: parseStatus(request.query.get('status')),
        priority: parsePriority(request.query.get('priority')),
        page: parsePositiveIntOrDefault(request.query.get('page'), 1),
        pageSize: parsePositiveIntOrDefault(request.query.get('pageSize'), 20, 100),
    });

    return { jsonBody: result, status: 200 };
}

export const GetTasks = withErrorHandling(getTasksHandler);

app.http('GetTasks', {
    route: 'tasks',
    methods: ['GET'],
    authLevel: 'function',
    handler: GetTasks
});
