import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandler } from "../middleware/errorHandler";
import { validateBody, validateQueryParams } from "../middleware/validateRequest";
import { FormSettingParamsSchema, UpdateFormSettingSchema } from "../models/formSetting.model";
import { FormSettingService } from "../services/formSetting.service";

const UpdateFormSettings = withErrorHandler(
  async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log(`Http function processed request for url "${request.url}"`);

    // Validasi query params (organizationId)
    const { organizationId } = validateQueryParams(request, FormSettingParamsSchema);

    // Validasi body — enforce field types, posisi unik, dll.
    const data = await validateBody(request, UpdateFormSettingSchema);

    const settings = await FormSettingService.upsertFormSettings(organizationId, data);

    return { jsonBody: settings, status: 200 };
  }
);

app.http("UpdateFormSettings", {
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: UpdateFormSettings,
});
