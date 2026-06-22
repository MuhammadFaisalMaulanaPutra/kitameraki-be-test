import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../database/cosmos";

export async function DeleteTask(
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
    await container.item(taskId, organizationId).delete();

    context.log(
      `Task deleted. taskId=${taskId}, organizationId=${organizationId}`,
    );

    return {
      status: 200,
      jsonBody: {
        message: "Task deleted successfully",
      },
    };
  } catch (error: any) {
    context.error(
      `Failed to delete task. taskId=${taskId}, organizationId=${organizationId}`,
      error,
    );

    return {
      status: 500,
      jsonBody: {
        message: "Failed to delete task",
      },
    };
  }
}

app.http("DeleteTask", {
  methods: ["DELETE"],
  authLevel: "function",
  handler: DeleteTask,
});
