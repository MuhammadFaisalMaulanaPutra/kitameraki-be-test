import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { createTask } from "../services/taskService";
import { Task, TaskPriority, TaskStatus } from "../models/Task";

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const VALID_STATUSES: TaskStatus[] = ["todo", "in-progress", "completed"];

export async function InsertTask(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const body = await request.json() as Partial<Task>;

        if (!body.id || !body.organizationId || !body.title || !body.status) {
            return {
                status: 400,
                jsonBody: {
                    message: "id, organizationId, title, and status are required",
                },
            };
        }

        if (body.title.length > 100) {
            return {
                status: 400,
                jsonBody: {
                    message: "title must not exceed 100 characters",
                },
            };
        }

        if (
            body.priority !== undefined &&
            !VALID_PRIORITIES.includes(body.priority)
        ) {
            return {
                status: 400,
                jsonBody: {
                    message: "Invalid priority",
                },
            };
        }

        if (!VALID_STATUSES.includes(body.status)) {
            return {
                status: 400,
                jsonBody: {
                    message: "Invalid status",
                },
            };
        }

        const task: Task = {
            id: body.id,
            organizationId: body.organizationId,
            title: body.title,
            description: body.description,
            dueDate: body.dueDate,
            priority: body.priority,
            status: body.status,
            tags: body.tags,
            customFields: body.customFields,
        };

        const createdTask = await createTask(task);

        return {
            status: 201,
            jsonBody: createdTask,
        };
    } catch (error) {
        context.error("Failed to create task", error);

        return {
            status: 500,
            jsonBody: {
                message: "Failed to create task",
            },
        };
    }
}

app.http("InsertTask", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: InsertTask,
});
