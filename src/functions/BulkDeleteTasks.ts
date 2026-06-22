import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../database/cosmos";

export async function BulkDeleteTasks(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const organizationId = request.query.get("organizationId");

  if (!organizationId) {
    return {
      status: 400,
      jsonBody: {
        message: "organizationId is required",
      },
    };
  }

  try {
    const body = (await request.json()) as unknown;

    if (!Array.isArray(body)) {
      return {
        status: 400,
        jsonBody: {
          message: "Body must be an array of task IDs",
        },
      };
    }

    const taskIds = body.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );

    if (taskIds.length === 0) {
      return {
        status: 400,
        jsonBody: {
          message: "No valid task IDs provided",
        },
      };
    }

    const results = await Promise.allSettled(
      taskIds.map((id) => container.item(id, organizationId).delete()),
    );

    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      status: 200,
      jsonBody: {
        message: "Bulk delete completed",
        total: taskIds.length,
        failed,
        success: taskIds.length - failed,
      },
    };
  } catch (error) {
    context.error("BulkDeleteTasks failed", {
      error,
      organizationId,
    });

    return {
      status: 500,
      jsonBody: {
        message: "Failed to delete tasks",
      },
    };
  }
}

app.http("BulkDeleteTasks", {
  methods: ["DELETE"],
  authLevel: "function",
  handler: BulkDeleteTasks,
});
