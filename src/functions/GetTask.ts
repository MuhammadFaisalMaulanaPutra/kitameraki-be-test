import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../database/cosmos";

export async function GetTask(
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
    const { resource } = await container.item(taskId, organizationId).read();

    if (!resource) {
      return {
        status: 404,
        jsonBody: {
          message: "Task not found",
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        data: resource,
      },
    };
  } catch (error) {
    context.error(
      `Failed to get task. taskId=${taskId}, organizationId=${organizationId}`,
      error,
    );

    return {
      status: 500,
      jsonBody: {
        message: "Failed to get task",
      },
    };
  }
}

app.http("GetTask", {
  methods: ["GET"],
  authLevel: "function",
  handler: GetTask,
});
