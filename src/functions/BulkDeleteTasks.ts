import { app } from "@azure/functions";
import { tasks } from "../lib/cosmos";
import { handler, readJson, requireOrgId } from "../lib/http";
import { validateBulkIds } from "../lib/validation";

app.http("BulkDeleteTasks", {
  methods: ["POST"],
  route: "tasks/bulk-delete",
  authLevel: "anonymous",
  handler: handler(async (request) => {
    const organizationId = requireOrgId(request);
    const ids = validateBulkIds(await readJson(request));

    // use allSettled instead of foreach(async) that not returns error
    const results = await Promise.allSettled(ids.map((id) => tasks.item(id, organizationId).delete()));

    const deleted: string[] = [];
    const notFound: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") deleted.push(ids[i]);
      else if ((r.reason as { code?: number }).code === 404) notFound.push(ids[i]);
      else throw r.reason;
    });
    return { jsonBody: { deleted, notFound } };
  }),
});
