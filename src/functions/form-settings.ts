import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as formSettingService from "@/services/form-setting.service";
import {
  GetFormSettingQuerySchema,
  UpsertFormSettingSchema,
} from "@/schemas/form-setting.schema";
import {
  ok,
  badRequest,
  handleControllerError,
} from "@/utils/http-response";

// GET /api/form-settings
app.http("form-settings-get", {
  methods: ["GET"],
  route: "form-settings",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      context.log("GET /api/form-settings triggered");
      const organizationId = req.query.get("organizationId");
      const parseResult = GetFormSettingQuerySchema.safeParse({ organizationId });

      if (!parseResult.success) {
        return badRequest("Invalid query parameter", parseResult.error.format());
      }

      const formSetting = await formSettingService.getFormSetting(parseResult.data.organizationId);
      return ok(formSetting);
    } catch (err) {
      return handleControllerError(err);
    }
  },
});

// PUT /api/form-settings
app.http("form-settings-upsert", {
  methods: ["PUT", "POST"],
  route: "form-settings",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      context.log("PUT /api/form-settings triggered");
      const queryOrgId = req.query.get("organizationId");
      if (!queryOrgId) {
        return badRequest("Query parameter 'organizationId' is required");
      }

      const rawBody = (await req.json()) as Record<string, unknown>;
      const effectivePayload = {
        ...rawBody,
        organizationId: queryOrgId,
      };

      const parseResult = UpsertFormSettingSchema.safeParse(effectivePayload);
      if (!parseResult.success) {
        return badRequest("Validation error", parseResult.error.format());
      }

      const orgId = queryOrgId;

      const updated = await formSettingService.upsertFormSetting(
        orgId,
        parseResult.data.components,
        parseResult.data.schemaVersion
      );
      return ok(updated);
    } catch (err) {
      return handleControllerError(err);
    }
  },
});
