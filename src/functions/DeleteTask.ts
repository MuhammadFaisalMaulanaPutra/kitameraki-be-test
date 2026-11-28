import { app } from "@azure/functions";
import { tasks } from "../lib/cosmos";
import { handler, requireIdParam, requireOrgId } from "../lib/http";

app.http("DeleteTask", {
  methods: ["DELETE"],
  route: "tasks/{id}",
  authLevel: "anonymous",
  handler: handler(async (request) => {
    const organizationId = requireOrgId(request);
    const id = requireIdParam(request);
    await tasks.item(id, organizationId).delete();
    return { status: 204 };
  }),
});