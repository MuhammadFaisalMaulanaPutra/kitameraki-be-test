import { app } from "@azure/functions";
import { formSettings } from "../lib/cosmos";
import { handler, readJson, requireOrgId } from "../lib/http";
import { toFormSettings } from "../lib/mappers";
import type { FormSettings } from "../lib/types";
import { validateFormRows } from "../lib/validation";

app.http("SaveFormSettings", {
  methods: ["PUT"],
  route: "form-settings",
  authLevel: "anonymous",
  handler: handler(async (request) => {
    const organizationId = requireOrgId(request);
    const rows = validateFormRows(await readJson(request));
    const doc: FormSettings = { id: organizationId, organizationId, rows, updatedAt: new Date().toISOString() };
    const { resource } = await formSettings.items.upsert(doc);
    return { jsonBody: toFormSettings(resource as unknown as Record<string, unknown>) };
  }),
});
