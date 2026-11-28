import { app } from "@azure/functions";
import { formSettings } from "../lib/cosmos";
import { defaultFormSettings } from "../lib/defaults";
import { handler, requireOrgId } from "../lib/http";
import { toFormSettings } from "../lib/mappers";

app.http("GetFormSettings", {
  methods: ["GET"],
  route: "form-settings",
  authLevel: "anonymous",
  handler: handler(async (request) => {
    const organizationId = requireOrgId(request);
    const { resource } = await formSettings.item(organizationId, organizationId).read();
    // return the default form instead of 404
    return { jsonBody: resource ? toFormSettings(resource) : defaultFormSettings(organizationId) };
  }),
});
