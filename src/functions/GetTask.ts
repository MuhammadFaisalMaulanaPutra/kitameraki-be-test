import { app } from "@azure/functions";
import { tasks } from "../lib/cosmos";
import { HttpError, handler, requireIdParam, requireOrgId } from "../lib/http";
import { toTask } from "../lib/mappers";

app.http("GetTask", {
   methods: ["GET"],
   route: "tasks/{id}",
   authLevel: "anonymous",
   handler: handler(async (request) => {
    const organizationId = requireOrgId(request);
    const id = requireIdParam(request);
    const { resource } = await tasks.item(id, organizationId).read();

    if (!resource) {
        throw new HttpError(404, "Task not found");
    }

    return { jsonBody: toTask(resource) };
   }),
});