import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../database/cosmos";

const ALLOWED_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "assignee",
  "dueDate",
] as const;

function buildPatchOperations(body: any) {
  const ops: any[] = [];

  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      ops.push({
        op: "replace",
        path: `/${key}`,
        value: body[key],
      });
    }
  }

  return ops;
}

export async function UpdateTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
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

  try {
    const body = await request.json();

    const patchOps = buildPatchOperations(body);

    if (patchOps.length === 0) {
      return {
        status: 400,
        jsonBody: {
          message: "No valid fields to update",
        },
      };
    }

    const result = await container.item(taskId, organizationId).patch(patchOps);

    return {
      status: 200,
      jsonBody: {
        data: result.resource,
      },
    };
  } catch (error) {
    context.error("UpdateTask failed", {
      error,
      taskId,
      organizationId,
    });

    return {
      status: 500,
      jsonBody: {
        message: "Failed to update task",
      },
    };
  }
}

app.http("UpdateTask", {
  methods: ["PATCH"],
  authLevel: "function",
  handler: UpdateTask,
});
