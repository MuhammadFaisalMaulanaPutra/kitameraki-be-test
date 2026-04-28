import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDefaultCosmosClient } from "../cosmos.util";

export async function DeleteTask(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const taskId = request.query.get("id");
  const organizationId = request.query.get("organizationId");

  const client = getDefaultCosmosClient();
  await client
    .database("TaskApp")
    .container("Tasks")
    .item(taskId, organizationId)
    .delete();

  return { status: 200 };
}

app.http("DeleteTask", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: DeleteTask,
});

// param: organizationId, id
