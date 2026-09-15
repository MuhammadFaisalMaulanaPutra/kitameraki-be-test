import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { updateTask } from "../services/taskService";
import { Task, TaskPriority, TaskStatus } from "../models/Task";

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const VALID_STATUSES: TaskStatus[] = ["todo", "in-progress", "completed"];

const ALLOWED_FIELDS: (keyof Task)[] = [
    "title",
    "description",
    "dueDate",
    "priority",
    "status",
    "tags",
    "customFields",
];

export async function UpdateTask(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const taskId = request.query.get("id");
        const organizationId = request.query.get("organizationId");

        if (!taskId || !organizationId) {
            return {
                status: 400,
                jsonBody: {
                    message: "id and organizationId are required",
                },
            };
        }

        const body = await request.json() as Partial<Task>;

        const updates: Partial<Task> = {};

        for (const field of ALLOWED_FIELDS) {
            if (body[field] !== undefined) {
                updates[field] = body[field] as never;
            }
        }

        if (Object.keys(updates).length === 0) {
            return {
                status: 400,
                jsonBody: {
                    message: "No valid fields to update",
                },
            };
        }

        if (
            updates.title !== undefined &&
            updates.title.length > 100
        ) {
            return {
                status: 400,
                jsonBody: {
                    message: "title must not exceed 100 characters",
                },
            };
        }

        if (
            updates.priority !== undefined &&
            !VALID_PRIORITIES.includes(updates.priority)
        ) {
            return {
                status: 400,
                jsonBody: {
                    message: "Invalid priority",
                },
            };
        }

        if (
            updates.status !== undefined &&
            !VALID_STATUSES.includes(updates.status)
        ) {
            return {
                status: 400,
                jsonBody: {
                    message: "Invalid status",
                },
            };
        }

        const updatedTask = await updateTask(
            taskId,
            organizationId,
            updates
        );

        if (!updatedTask) {
            return {
                status: 404,
                jsonBody: {
                    message: "Task not found",
                },
            };
        }

        return {
            status: 200,
            jsonBody: updatedTask,
        };
    } catch (error) {
        context.error("Failed to update task", error);

        return {
            status: 500,
            jsonBody: {
                message: "Failed to update task",
            },
        };
    }
}

app.http("UpdateTask", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: UpdateTask,
});
