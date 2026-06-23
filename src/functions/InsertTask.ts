import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../database/cosmos";

function validateTask(body: any): string | null {
  if (!body?.title || typeof body.title !== "string") {
    return "title is required";
  }

  if (!body?.organizationId || typeof body.organizationId !== "string") {
    return "organizationId is required";
  }

  return null;
}

export async function InsertTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body: Record<string, any> = await request.json();

    const validationError = validateTask(body);
    if (validationError) {
      return {
        status: 400,
        jsonBody: { message: validationError },
      };
    }

    const newTask = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description ?? "",
      status: body.status ?? "Todo",
      priority: body.priority ?? "Medium",
      assignee: body.assignee ?? null,
      dueDate: body.dueDate ?? null,
      organizationId: body.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customFields: body.customFields ?? {},
    };

    const result = await container.items.create(newTask);

    return {
      status: 201,
      jsonBody: {
        data: result.resource,
      },
    };
  } catch (error) {
    context.error("InsertTask failed", error);

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
  authLevel: "function",
  handler: InsertTask,
});
