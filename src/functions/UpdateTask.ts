import { app } from "@azure/functions";
import { tasks } from "../lib/cosmos";
import { HttpError, handler, readJson, requireIdParam, requireOrgId } from "../lib/http";
import { toTask } from "../lib/mappers";
import { validateTaskInput } from "../lib/validation";

app.http("UpdateTask", {
  methods: ["PATCH"],
  route: "tasks/{id}",
  authLevel: "anonymous",
  handler: handler(async (request) => {
    const organizationId = requireOrgId(request);
    const id = requireIdParam(request);
    // only known task properties pass validation, so the ids can never be overwritten
    const changes = validateTaskInput(await readJson(request), true);

    const item = tasks.item(id, organizationId);
    const { resource: existing } = await item.read();
    if (!existing) throw new HttpError(404, "Task not found");

    const merged = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    const { resource } = await item.replace(merged, { accessCondition: { type: "IfMatch", condition: existing._etag } });

    return { jsonBody: toTask(resource as unknown as Record<string, unknown>) };
  }),
});
