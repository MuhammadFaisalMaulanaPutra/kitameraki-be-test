import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { formSettingsRepository } from "../repositories/formSettingsRepository";
import { apiResponse } from "../../../core/utils/apiResponse";
import { HTTP_STATUS } from "../../../core/constants/httpStatus";

export async function GetFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`[HTTP] Processing request for GetFormSettings: "${request.url}"`);

  try {
    const organizationId = request.query.get('organizationId');

    if (!organizationId) {
      return apiResponse.error("organizationId is required", HTTP_STATUS.BAD_REQUEST);
    }

    let settings = await formSettingsRepository.findByOrganizationId(organizationId);

    // If not found, return empty fields structure instead of 404
    if (!settings) {
      settings = {
        id: `settings_${organizationId}`,
        organizationId: organizationId,
        fields: []
      };
    }

    return apiResponse.success(settings);

  } catch (error: any) {
    context.error(`[Error] GetFormSettings failed: ${error.message}`);
    return apiResponse.error("Internal Server Error");
  }
}
