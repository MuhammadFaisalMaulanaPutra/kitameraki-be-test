import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withErrorHandler } from "../middleware/errorHandler";
import { validateQueryParams } from "../middleware/validateRequest";
import { FormSettingParamsSchema } from "../models/formSetting.model";
import { FormSettingService } from "../services/formSetting.service";

const GetFormSettings = withErrorHandler(
  async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log(`Http function processed request for url "${request.url}"`);

    const { organizationId } = validateQueryParams(request, FormSettingParamsSchema);

    const settings = await FormSettingService.getFormSettings(organizationId);

    // Jika belum ada konfigurasi, kembalikan default kosong
    if (!settings) {
      return {
        status: 200,
        jsonBody: {
          id: organizationId,
          organizationId,
          fields: [],
          updatedAt: null,
        },
      };
    }

    return { jsonBody: settings, status: 200 };
  }
);

app.http("GetFormSettings", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetFormSettings,
});
