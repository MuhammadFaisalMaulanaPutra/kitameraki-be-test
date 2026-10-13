import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as organizationService from "@/services/organization.service";
import { ok, handleControllerError } from "@/utils/http-response";

// GET /api/organizations
app.http("organizations-list", {
  methods: ["GET"],
  route: "organizations",
  authLevel: "anonymous",
  handler: async (_req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      context.log("GET /api/organizations triggered");
      const organizationIds = await organizationService.getOrganizationIds();
      return ok(organizationIds, { count: organizationIds.length });
    } catch (err) {
      return handleControllerError(err);
    }
  },
});
