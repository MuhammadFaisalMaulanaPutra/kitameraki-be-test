import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { formSettingsRepository } from "../repositories/formSettingsRepository";
import { apiResponse } from "../../../core/utils/apiResponse";
import { HTTP_STATUS } from "../../../core/constants/httpStatus";
import { FormSettings } from "../types/FormSettings";

export async function UpdateFormSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`[HTTP] Processing request for UpdateFormSettings: "${request.url}"`);

  try {
    const organizationId = request.query.get('organizationId');

    if (!organizationId) {
      return apiResponse.error("organizationId is required", HTTP_STATUS.BAD_REQUEST);
    }

    const payload = await request.json() as Omit<FormSettings, 'id' | 'organizationId'>;
    
    if (!payload || !Array.isArray(payload.fields)) {
      return apiResponse.error("Invalid payload format", HTTP_STATUS.BAD_REQUEST);
    }

    const newSettings: FormSettings = {
      id: `settings_${organizationId}`,
      organizationId,
      fields: payload.fields
    };

    const savedSettings = await formSettingsRepository.upsert(newSettings);

    return apiResponse.success(savedSettings);

  } catch (error: any) {
    context.error(`[Error] UpdateFormSettings failed: ${error.message}`);
    return apiResponse.error("Internal Server Error");
  }
}
